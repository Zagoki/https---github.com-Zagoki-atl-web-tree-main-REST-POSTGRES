const express = require("express");
const postgres = require("postgres");
const z = require("zod");
const crypto = require("crypto");
//const fetch = require("node-fetch");

const app = express();
const port = 8000;
const sql = postgres({ db: "mydb", user: "user", password: "password" });
// MATTHEO TODO   test les requetes about fps  etccc... 

app.use(express.json());

// Schemas
const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  about: z.string(),
  price: z.number().positive(),
});
const CreateProductSchema = ProductSchema.omit({ id: true });

const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  password: z.string(),
  email: z.string().email(),
});
const CreateUserSchema = UserSchema.omit({ id: true });
const UpdateUserSchema = UserSchema.partial().omit({ id: true, password: true });

// Hash password function
const hashPassword = (password) => {
  return crypto.createHash('sha512').update(password).digest('hex');
};

// Routes for Products
app.post("/products", async (req, res) => {
  const result = await CreateProductSchema.safeParse(req.body);

  if (result.success) {
    const { name, about, price } = result.data;

    const product = await sql`
      INSERT INTO products (name, about, price)
      VALUES (${name}, ${about}, ${price})
      RETURNING *
      `;
    res.send(product[0]);
  } else {
    res.status(400).send(result);
  }
});

app.get("/products", async (req, res) => {
  const { name, about, price } = req.query;

  try {
    // Construire dynamiquement la requête SQL en fonction des paramètres fournis
    const conditions = [];
    if (name) {
      conditions.push(sql`name ILIKE ${'%' + name + '%'}`);
    }
    if (about) {
      conditions.push(sql`about ILIKE ${'%' + about + '%'}`);
    }
    if (price) {
      conditions.push(sql`price <= ${Number(price)}`);
    }

    // Si des conditions existent, les ajouter à la requête
    const query = sql`
      SELECT * FROM products
      ${conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``}
    `;

    const products = await query;
    res.send(products);
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.get("/products/:id", async (req, res) => {
  const product = await sql`
    SELECT * FROM products WHERE id=${req.params.id}
    `;
  if (product.length > 0) {
    res.send(product[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

app.delete("/products/:id", async (req, res) => {
  const product = await sql`
    DELETE FROM products
    WHERE id=${req.params.id}
    RETURNING *
    `;
  if (product.length > 0) {
    res.send(product[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

// Routes for Users
app.post("/users", async (req, res) => {
  const result = await CreateUserSchema.safeParse(req.body);

  if (result.success) {
    const { username, password, email } = result.data;
    const hashedPassword = hashPassword(password);

    const user = await sql`
      INSERT INTO users (username, password, email)
      VALUES (${username}, ${hashedPassword}, ${email})
      RETURNING id, username, email
      `;
    res.send(user[0]);
  } else {
    res.status(400).send(result);
  }
});

app.get("/users", async (req, res) => {
  const users = await sql`
    SELECT id, username, email FROM users
    `;
  res.send(users);
});

app.get("/users/:id", async (req, res) => {
  const user = await sql`
    SELECT id, username, email FROM users WHERE id=${req.params.id}
    `;
  if (user.length > 0) {
    res.send(user[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

app.put("/users/:id", async (req, res) => {
  const result = await CreateUserSchema.safeParse(req.body);

  if (result.success) {
    const { username, password, email } = result.data;
    const hashedPassword = hashPassword(password);

    const user = await sql`
      UPDATE users
      SET username=${username}, password=${hashedPassword}, email=${email}
      WHERE id=${req.params.id}
      RETURNING id, username, email
      `;
    if (user.length > 0) {
      res.send(user[0]);
    } else {
      res.status(404).send({ message: "Not found" });
    }
  } else {
    res.status(400).send(result);
  }
});

app.patch("/users/:id", async (req, res) => {
  const result = await UpdateUserSchema.safeParse(req.body);

  if (result.success) {
    const updates = result.data;
    if (updates.password) {
      updates.password = hashPassword(updates.password);
    }
    
    const user = await sql`
      UPDATE users
      SET ${sql(updates)}
      WHERE id=${req.params.id}
      RETURNING id, username, email
      `;

    if (user.length > 0) {
      res.send(user[0]);
    } else {
      res.status(404).send({ message: "Not found" });
    }
  } else {
    res.status(400).send(result);
  }
});

app.delete("/users/:id", async (req, res) => {
  const user = await sql`
    DELETE FROM users
    WHERE id=${req.params.id}
    RETURNING id, username, email
    `;

  if (user.length > 0) {
    res.send(user[0]);
  } else {
    res.status(404).send({ message: "Not found" });
  }
});

// Routes for Free-to-Play Games

// GET /f2p-games - Fetch all Free-to-Play games
app.get("/f2p-games", async (req, res) => {
  try {
    const response = await fetch("https://www.freetogame.com/api/games");
    if (!response.ok) {
      throw new Error(`Error fetching games: ${response.statusText}`);
    }
    const games = await response.json();
    res.status(200).json(games); // Return the list of games
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /f2p-games/:id - Fetch a specific Free-to-Play game by ID
app.get("/f2p-games/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await fetch(`https://www.freetogame.com/api/game?id=${id}`);
    if (!response.ok) {
      if (response.status === 404) {
        return res.status(404).json({ message: "Game not found" });
      }
      throw new Error(`Error fetching game: ${response.statusText}`);
    }
    const game = await response.json();
    res.status(200).json(game); // Return the game details
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});