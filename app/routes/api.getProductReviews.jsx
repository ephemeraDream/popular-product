import prisma from "../db.server";
import { cors } from 'remix-utils/cors';
import { json } from "@remix-run/node";

export const action = async ({ request }) => {
  try {
    const formData = await request.formData();

    const publish = formData.get('publish') ? JSON.parse(formData.get('publish')) : undefined;
    const productId = formData.get('productId') || undefined;
    const page = Number(formData.get('page')) || 1;
    const PAGESIZE = 3
    const pagesize = formData.get('pagesize') || PAGESIZE;
    const skip = (page - 1) * pagesize;

    const reviews = await prisma.product_Review.findMany({
      where: {
        productId: productId,
        publish: publish,
      },
      skip: skip,
      take: Number(pagesize),
    });

    const totalReviews = await prisma.product_Review.count({
      where: {
        productId: productId,
        publish: publish,
      },
    });

    const responseJson = json({
      ok: true,
      message: "successfully",
      data: reviews,
      page: {
        currentPage: page,
        totalPages: Math.ceil(totalReviews / pagesize),
        totalReviews: totalReviews
      }
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