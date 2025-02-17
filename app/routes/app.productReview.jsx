import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  useIndexResourceState,
  IndexFilters,
  useSetIndexFiltersMode,
  Thumbnail,
  Button,
  InlineStack,
  Text,
  BlockStack
} from "@shopify/polaris";
import { useState, useRef } from 'react';
import prisma from "../db.server";
import "./css/reset.css"

export async function loader({ request }) {
  const pagesize = 10
  const reviews = await prisma.product_Review.findMany({
    take: pagesize,
  });

  const totalReviews = await prisma.product_Review.count({
  });

  const initTotalPages = Math.ceil(totalReviews / pagesize)

  return { reviews, initTotalPages }
}

export default function ProductReviews() {
  const { reviews, initTotalPages } = useLoaderData();

  const [selected, setSelected] = useState(0);
  const { mode, setMode } = useSetIndexFiltersMode();
  const [reviewsList, setReviewsList] = useState(reviews);
  const [product, setProduct] = useState();

  const page = useRef(1);
  const totalPages = useRef(initTotalPages);
  const status = useRef('');
  const productId = useRef();

  const tabs = ["All", "Published", "Unpublished",].map((item, index) => ({
    content: item,
    index,
    onAction: () => {
      switch (item) {
        case "All":
          status.current = ''
          break
        case "Published":
          status.current = true
          break
        case "Unpublished":
          status.current = false
          break
      }
      page.current = 1
      getProductReviews();
    },
    id: `${item}-${index}`,
  }));

  const { selectedResources, allResourcesSelected, handleSelectionChange } =
    useIndexResourceState(reviewsList);

  const promotedBulkActions = [
    {
      content: 'delete',
      onAction: () => deleteProductReviews(),
      destructive: true
    },
    {
      content: 'publish',
      onAction: () => {
        updateProductReviewsStatus(true)
      },
    },
    {
      content: 'unpublish',
      onAction: () => {
        updateProductReviewsStatus(false)
      },
    },
  ];

  const ImageList = (images) => {
    const imageUrls = images.split(',');

    return (
      <div>
        {imageUrls.map((url, index) => (
          <Thumbnail
            key={index}
            source={url.trim()}
            size="large"
            alt="Black choker necklace"
          />
        ))}
      </div>
    );
  };

  const getProductReviews = async () => {
    const formData = new FormData();
    formData.append("publish", status.current);
    formData.append("productId", productId.current || "");
    formData.append("page", page.current);
    formData.append("pagesize", 10);

    const response = await fetch("/api/getProductReviews", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.ok) {
      totalPages.current = result.page.totalPages
      setReviewsList(result.data)
    }
  }

  const updateProductReviewsStatus = async (status) => {
    const request = {
      publish: status,
      id: selectedResources
    }
    const response = await fetch("/api/updateProductReviewsStatus", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    const result = await response.json();
    if (result.ok) {
      page.current = 1
      getProductReviews()
    }
  }

  const rowMarkup = reviewsList.map(
    (
      { id, firstName, lastName, comment, images, publish },
      index,
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell className="width-small">
          {firstName}
        </IndexTable.Cell >
        <IndexTable.Cell className="width-small">{lastName}</IndexTable.Cell>
        <IndexTable.Cell>
          {comment}
        </IndexTable.Cell>
        <IndexTable.Cell>
          {ImageList(images)}
        </IndexTable.Cell>
        <IndexTable.Cell className="width-small">{publish ? "Published" : "Unpublished"}</IndexTable.Cell>
      </IndexTable.Row>
    ),
  );

  const handlePageChange = (newPage) => {
    page.current = newPage
    getProductReviews();
  }

  async function selectProduct() {
    const products = await window.shopify.resourcePicker({
      type: "product",
      action: "select", // customized action verb, either 'select' or 'add',
    });

    if (products) {
      const { images, id, variants, title, handle } = products[0];

      setProduct({
        productId: id,
        productVariantId: variants[0].id,
        productTitle: title,
        productHandle: handle,
        productAlt: images[0]?.altText,
        productImage: images[0]?.originalSrc,
      });
      productId.current = id.match(/\/(\d+)$/)[1]
      getProductReviews()
    }
  }

  const clearProduct = () => {
    setProduct()
    productId.current = ""
    getProductReviews()
  }

  const deleteProductReviews = async () => {
    const request = {
      id: selectedResources
    }
    const response = await fetch("/api/deleteProductReviews", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    const result = await response.json();
    if (result.ok) {
      page.current = 1
      getProductReviews()
      handleSelectionChange([])
    }
  }

  return (
    <Page title="Product Reviews">
      <Card>
        {product && product.productId ? (
          <InlineStack blockAlign="center" gap="500">
            <Thumbnail
              source={product.productImage}
              alt={product.productAlt}
            />
            <Text as="span" variant="headingMd" fontWeight="semibold">
              {product.productTitle}
            </Text>
            <Button variant="plain" onClick={selectProduct}>
              Change product
            </Button>
            <Button variant="plain" onClick={clearProduct}>
              Clear product
            </Button>
          </InlineStack>
        ) : (
          <BlockStack gap="200">
            <Button onClick={selectProduct} id="select-product">
              Select product
            </Button>
          </BlockStack>
        )}
        <IndexFilters
          tabs={tabs}
          selected={selected}
          onSelect={setSelected}
          mode={mode}
          setMode={setMode}
          hideFilters
          hideQueryField
          canCreateNewView={false}
        />
        <IndexTable
          resourceName={{ singular: 'review', plural: 'reviews' }}
          itemCount={reviewsList.length}
          selectedItemsCount={
            allResourcesSelected ? 'All' : selectedResources.length
          }
          promotedBulkActions={promotedBulkActions}
          onSelectionChange={handleSelectionChange}
          headings={[
            { title: 'First Name' },
            { title: 'Last Name' },
            { title: 'Comment' },
            { title: 'Images' },
            { title: 'Status' },
          ]}
          pagination={{
            hasPrevious: page.current > 1,
            hasNext: page.current < totalPages.current,
            onPrevious: () => handlePageChange(page.current - 1),
            onNext: () => handlePageChange(page.current + 1)
          }}
        >
          {rowMarkup}
        </IndexTable>
      </Card>
    </Page>
  );
}