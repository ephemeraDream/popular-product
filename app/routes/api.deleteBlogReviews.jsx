import prisma from "../db.server";
import { cors } from 'remix-utils/cors';
import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  try {

    const requestData = await request.json();

    const deleteReviews = await prisma.blog_Review.deleteMany({
      where: {
        id: {
          in: requestData.id,
        },
      },
    });
    const responseJson = json({
      ok: true,
      message: "successfully",
      data: deleteReviews,
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