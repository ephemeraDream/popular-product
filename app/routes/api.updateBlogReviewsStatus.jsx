import prisma from "../db.server";
import { cors } from 'remix-utils/cors';
import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  try {

    const requestData = await request.json();

    const updatedReviews = await prisma.blog_Review.updateMany({
      where: {
        id: {
          in: requestData.id,
        },
      },
      data: {
        publish: requestData.publish,
      },
    });
    const responseJson = json({
      ok: true,
      message: "successfully",
      data: updatedReviews,
    });
    return cors(request, responseJson);
  } catch (error) {
    console.error("Error occurred:", error);
    const errorResponse = ({
      ok: false,
      message: error.message,
    });
    return cors(request, errorResponse);
  }
};