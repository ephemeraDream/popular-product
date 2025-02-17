import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { cors } from 'remix-utils/cors';

export const action = async ({ request }) => {
  try {
    const formData = await request.formData();
    const prevFile = formData.get('file');
    const alt = formData.get('alt') || "product comment";

    const { admin } = await authenticate.public.appProxy(request);

    if (!admin) {
      throw new Error("Shopify session not available");
    }

    const data = await admin.graphql(
      `#graphql
      mutation stagedUploadsCreate($input: [StagedUploadInput!]!) {
          stagedUploadsCreate(input: $input) {
            stagedTargets {
              url
              resourceUrl
              parameters {
                name
                value
              }
            }
          }
        }`,
      {
        variables: {
          input: [
            {
              filename: prevFile.name,
              mimeType: prevFile.type,
              httpMethod: "POST",
              resource: "IMAGE",
            },
          ],
        },
      },
    );

    const responseJson = await data.json();
    const { stagedTargets } = responseJson.data.stagedUploadsCreate;
    if (!stagedTargets || stagedTargets.length === 0) {
      throw new Error("Failed to get staged upload target");
    }

    const uploadTarget = stagedTargets[0];
    const { url, parameters } = uploadTarget;

    const formDataForUpload = new FormData();
    parameters.forEach(param => {
      formDataForUpload.append(param.name, param.value);
    });
    formDataForUpload.append("file", prevFile);

    const uploadResponse = await fetch(url, {
      method: "POST",
      body: formDataForUpload,
    });

    if (!uploadResponse.ok) {
      throw new Error("File upload failed");
    }

    const resourceUrl = uploadTarget.resourceUrl;

    const fileData = await admin.graphql(
      `#graphql
     mutation fileCreate($files: [FileCreateInput!]!) {
          fileCreate(files: $files) {
            files {
              id
              fileStatus
              alt
              createdAt
            }
          }
        }`,
      {
        variables: {
          files: [
            {
              alt: alt,
              contentType: "IMAGE", 
              originalSource: resourceUrl,
            },
          ],
        },
      },
    );

    const fileDataJson = await fileData.json();
    const file = fileDataJson.data.fileCreate.files[0];

    let retries = 5;
    while (file.fileStatus !== 'READY' && retries > 0) {
      console.log("File is not ready, checking again...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      retries--;

      const query = await admin.graphql(
        `#graphql
        query {
          node(id: "${file.id}") {
            id
            ... on MediaImage {
              image {
                url
              }
            }
          }
        }`
      );

      const queryJson = await query.json();
      const mediaImage = queryJson.data.node;

      if (mediaImage && mediaImage.image) {
        file.fileStatus = 'READY';
        file.imageUrl = mediaImage.image.url;
      }
    }

    if (file.fileStatus === 'READY') {
      const responseJson = json({
        ok: true,
        message: "Image uploaded successfully",
        data: {
          id: file.id,
          url: file.imageUrl,
        },
      });
      return cors(request, responseJson);
    } else {
      throw new Error("Image upload failed or timed out");
    }

  } catch (error) {
    console.error("Error occurred:", error);
    const errorResponse = json({
      ok: false,
      message: error.message,
    });
    return cors(request, errorResponse);
  }
};
