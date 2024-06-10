import { PrismaClient } from "@prisma/client";
import express from "express";

const prisma = new PrismaClient();
const app = express();

app.use(express.json());

// Test route to ensure the server is running
app.get('/', (req, res) => {
  res.send('Hello, world!');
});

app.post(`/post`, async (req, res) => {
  const { title, content, authorEmail } = req.body;
  try {
    const result = await prisma.post.create({
      data: {
        title,
        content,
        author: {
          connect: { email: authorEmail },
        },
      },
    });
    res.json(result);
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(400).json({ error: "Failed to create post" });
  }
});

app.put("/post/:id/views", async (req, res) => {
  const { id } = req.params;
  try {
    const post = await prisma.post.update({
      where: { id: Number(id) },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
    res.json(post);
  } catch (error) {
    console.error("Error updating post views:", error);
    res.status(404).json({ error: `Post with ID ${id} does not exist in the database` });
  }
});

app.put("/publish/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const post = await prisma.post.findUnique({ where: { id: Number(id) } });
    if (!post) {
      throw new Error("Post not found");
    }
    const updatedPost = await prisma.post.update({
      where: { id: Number(id) },
      data: { published: !post.published },
    });
    res.json(updatedPost);
  } catch (error) {
    console.error("Error toggling post publish state:", error);
    res.status(404).json({ error: `Post with ID ${id} does not exist in the database` });
  }
});

app.delete(`/post/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const post = await prisma.post.delete({
      where: { id: Number(id) },
    });
    res.json(post);
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(404).json({ error: `Post with ID ${id} does not exist in the database` });
  }
});

app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.get("/user/:id/drafts", async (req, res) => {
  const { id } = req.params;
  try {
    const drafts = await prisma.post.findMany({
      where: {
        authorId: Number(id),
        published: false,
      },
    });
    res.json(drafts);
  } catch (error) {
    console.error("Error fetching drafts:", error);
    res.status(500).json({ error: "Failed to fetch drafts" });
  }
});

app.get(`/post/:id`, async (req, res) => {
  const { id } = req.params;
  try {
    const post = await prisma.post.findUnique({
      where: { id: Number(id) },
    });
    res.json(post);
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(404).json({ error: `Post with ID ${id} does not exist in the database` });
  }
});

app.get("/feed", async (req, res) => {
  const { searchString, skip, take, orderBy } = req.query;
  try {
    const orConditions = searchString
      ? [
          {
            title: {
              contains: searchString.toString(),
              mode: "insensitive",
            },
          },
          {
            content: {
              contains: searchString.toString(),
              mode: "insensitive",
            },
          },
        ]
      : [];

    const posts = await prisma.post.findMany({
      where: {
        published: true,
        OR: orConditions,
      },
      include: { author: true },
      skip: skip ? Number(skip) : undefined,
      take: take ? Number(take) : undefined,
      orderBy: orderBy ? { updatedAt: orderBy.toString() === "asc" ? "asc" : "desc" } : undefined,
    });
    res.json(posts);
  } catch (error) {
    console.error("Error fetching feed:", error);
    res.status(500).json({ error: "Failed to fetch feed" });
  }
});

const server = app.listen(3001, () =>
  console.log(`
🚀 Server ready at: http://localhost:3001`)
);

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

