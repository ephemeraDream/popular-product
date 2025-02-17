import prisma from "../db.server";
import { cors } from 'remix-utils/cors';
import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  try {

    const formData = await request.formData();

    const comment = formData.get('comment');
    const productId = formData.get('productId');
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const images = formData.get('images');

    const newReview = await prisma.product_Review.create({
      data: {
        comment,
        productId,
        firstName,
        lastName,
        images,
      },
    });
    const responseJson = json({
      ok: true,
      message: "Image uploaded successfully",
      data: newReview,
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