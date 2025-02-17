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
import { useState, useRef, useEffect, useCallback } from 'react';
import prisma from "../db.server";
import { authenticate } from "../shopify.server";
import "./css/reset.css"

export async function loader({ request }) {
  const pagesize = 10
  const reviews = await prisma.blog_Review.findMany({
    take: pagesize,
  });

  const totalReviews = await prisma.blog_Review.count({
  });

  const initTotalPages = Math.ceil(totalReviews / pagesize)

  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
      query {
        articles(first: 250) {
          nodes {
            title
            id
            image {
              url
            }
          }
        }
      }`
  );

  const articleListResponse = await response.json();
  const articleList = articleListResponse.data.articles.nodes

  return { reviews, initTotalPages, articleList }
}

export default function BlogReviews() {
  const { reviews, initTotalPages, articleList } = useLoaderData();

  const [selected, setSelected] = useState(0);
  const { mode, setMode } = useSetIndexFiltersMode();
  const [reviewsList, setReviewsList] = useState(reviews);
  const [blog, setBlog] = useState();
  const [selectItems, setselectItems] = useState([]);

  const page = useRef(1);
  const totalPages = useRef(initTotalPages);
  const status = useRef('');
  const blogId = useRef();

  useEffect(() => {
    const transformedArray = articleList.map(item => ({
      id: item.id,
      heading: item.title,
      thumbnail: {
        url: item.image.url
      }
    }))
    setselectItems(transformedArray)
  }, [articleList])

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
      onAction: () => deleteBlogReviews(),
      destructive: true
    },
    {
      content: 'publish',
      onAction: () => {
        updateBlogReviewsStatus(true)
      },
    },
    {
      content: 'unpublish',
      onAction: () => {
        updateBlogReviewsStatus(false)
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
    formData.append("blogId", blogId.current || "");
    formData.append("page", page.current);
    formData.append("pagesize", 10);

    const response = await fetch("/api/getBlogReviews", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();
    if (result.ok) {
      totalPages.current = result.page.totalPages
      setReviewsList(result.data)
    }
  }

  const updateBlogReviewsStatus = async (status) => {
    const request = {
      publish: status,
      id: selectedResources
    }
    const response = await fetch("/api/updateBlogReviewsStatus", {
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
      { id, name, comment, images, publish },
      index,
    ) => (
      <IndexTable.Row
        id={id}
        key={id}
        selected={selectedResources.includes(id)}
        position={index}
      >
        <IndexTable.Cell className="width-small">
          {name}
        </IndexTable.Cell >
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

  const selectBlog = useCallback(async () => {
    const blog = await window.shopify.picker({
      heading: "choose blog",
      items: selectItems,
    });

    if (blog.selected.length) {
      const selectBlog = selectItems.find(item => item.id === blog.selected[0])

      const { id, heading, thumbnail } = selectBlog;

      setBlog({
        blogId: id,
        blogTitle: heading,
        blogImage: thumbnail.url,
      });
      blogId.current = id.match(/\/(\d+)$/)[1]
      getProductReviews()
    }
  }, [selectItems])

  const clearProduct = () => {
    setBlog()
    blogId.current = ""
    getProductReviews()
  }

  const deleteBlogReviews = async () => {
    const request = {
      id: selectedResources
    }
    const response = await fetch("/api/deleteBlogReviews", {
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
    <Page title="Blog Reviews">
      <Card>
        {blog && blog.blogId ? (
          <InlineStack blockAlign="center" gap="500">
            <Thumbnail
              source={blog.blogImage}
            />
            <Text as="span" variant="headingMd" fontWeight="semibold">
              {blog.blogTitle}
            </Text>
            <Button variant="plain" onClick={selectBlog}>
              Change blog
            </Button>
            <Button variant="plain" onClick={clearProduct}>
              Clear blog
            </Button>
          </InlineStack>
        ) : (
          <BlockStack gap="200">
            <Button onClick={selectBlog} id="select-blog">
              Select blog
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
            { title: 'name' },
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