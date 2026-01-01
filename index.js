const express = require('express');
const path = require('path');
const app = express();
const userRouter = require('./routes/user');
const blogRouter = require('./routes/blog');
const Blog = require('./models/blog'); 
const alumniPostsRoutes = require("./routes/alumniPosts");
const facultyPostsRoutes = require("./routes/facultyposts");
const studentPostsRoutes = require("./routes/studentPosts");
const StudentProfile = require("./models/studentprofile");
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const { checkForAuthenticationCookie } = require('./middlewares/authentication');
require("dotenv").config(); // Load environment variables
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const mongoURI = "mongodb+srv://s22jaiswaladitya:IJIQY8lapCKNjRBT@mymongodb.sidfc.mongodb.net/blogify?retryWrites=true&w=majority";

mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB Atlas"))
.catch((err) => console.error("MongoDB connection error:", err));
// Middleware to parse form data
const cors = require("cors");
app.use(express.json());

app.use(cors({ origin: "http://localhost:3000", credentials: true }));

app.use(express.urlencoded({ extended: true }));

// Set view engine to EJS
app.set('view engine', 'ejs');
app.set('views', path.resolve(__dirname, 'views'));

// Middleware to make user available globally
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    next();
});

// Serve static files
app.use(express.static('public'));

// Middleware to parse cookies
app.use(cookieParser());
app.use(alumniPostsRoutes);
app.use(facultyPostsRoutes);
app.use(studentPostsRoutes);
// Authentication middleware
app.use(checkForAuthenticationCookie());

// Home route
app.get('/', async (req, res) => {
    try {
        const allBlogs = await Blog.find({}); // Use `Blog` (uppercase)
        console.log("Home route accessed");
        res.render("home", {
            user: req.user,
            blogs: allBlogs // Correctly pass 'blogs'
        });
    } catch (error) {
        console.error("Error fetching blogs:", error);
        res.status(500).send("An error occurred while loading the home page.");
    }
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Use user router
app.use('/user', userRouter);
app.use('/blog', blogRouter);


app.use("/api/users", userRouter);






const Connections = require("./models/connections");

// POST /connections/add
app.post("/connections/add", async (req, res) => {
  try {
    const { userEmail, connectToEmail } = req.body;

    if (!userEmail || !connectToEmail) {
      return res.status(400).json({ message: "Both emails are required" });
    }

    const user = userEmail.trim().toLowerCase();
    const connectTo = connectToEmail.trim().toLowerCase();

    // Find or create user entry
    let userConnections = await Connections.findOne({ userEmail: user });
    if (!userConnections) {
      userConnections = new Connections({ userEmail: user, connections: [] });
    }

    // Prevent duplicate connections
    if (!userConnections.connections.includes(connectTo)) {
      userConnections.connections.push(connectTo);
      await userConnections.save();
      return res.json({ success: true, message: `Connected to ${connectToEmail}` });
    } else {
      return res.json({ success: true, message: `Already connected with ${connectToEmail}` });
    }

  } catch (err) {
    console.error("Connections error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// ================= Followers API ====================
app.get("/followers/:email", async (req, res) => {
  try {
    console.log("\n============================");
    console.log("📥 API HIT → /followers/");
    const email = req.params.email.toLowerCase().trim();
    console.log("🔍 Fetch followers of →", email);

    const followers = await Connections.find({
      connections: { $in: [email] }
    }).select("userEmail");

    console.log("📌 Followers Found:", followers);
    console.log("============================\n");

    res.json({ followers: followers.map(f => f.userEmail) });

  } catch (error) {
    console.error("🔥 Followers fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});
app.get("/following/:email", async (req, res) => {
  try {
    console.log("\n========== FETCHING FOLLOWING ==========");
    
    const email = req.params.email.toLowerCase().trim();
    console.log("Requested following for:", email);

    const userConnections = await Connections.findOne({ userEmail: email });
    console.log("Connections Document Found:", userConnections);

    if (!userConnections || userConnections.connections.length === 0) {
      console.log("User is not following anyone.");
      return res.json({ following: [] });
    }

    console.log("Following emails:", userConnections.connections);
    
    return res.json({ following: userConnections.connections });

  } catch (error) {
    console.error("Following fetch error:", error);
    res.status(500).json({ error: "Server error occurred" });
  }
});

// rank route
app.get("/rank/:email", async (req, res) => {
  try {
    const email = req.params.email.toLowerCase().trim();
    console.log("\n🔍 Checking rank for:", email);

    const users = await StudentCredits.find().sort({ totalCredits: -1 });
    console.log("📊 Sorted ranking list:", users.length);

    if (users.length === 0) {
      return res.json({ rank: null, totalCredits: 0, leaderboard: [] });
    }

    // Find user rank
    const rank = users.findIndex(u => u.studentEmail === email) + 1;

    const userData = users.find(u => u.studentEmail === email);
    const totalCredits = userData ? userData.totalCredits : 0;

    console.log(`🏆 User Rank: ${rank} | Credits: ${totalCredits}`);

    res.json({
      rank,
      totalCredits,
      leaderboard: users.map((u, index) => ({
        position: index + 1,
        email: u.studentEmail,
        points: u.totalCredits
      }))
    });

  } catch (error) {
    console.error("❌ Rank fetch error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/my-connections/:userEmail", async (req, res) => {
  try {
    const userEmail = req.params.userEmail.toLowerCase().trim();
    console.log("Fetching connections for user:", userEmail);

    const connectionsDoc = await Connections.findOne({ userEmail });
    console.log("Connections document found:", connectionsDoc);

    if (!connectionsDoc || !connectionsDoc.connections || connectionsDoc.connections.length === 0) {
      console.log("No connections found for this user.");
      return res.json({ connections: [] });
    }

    // Just return the emails array
    console.log("Connections emails:", connectionsDoc.connections);
    return res.json({ connections: connectionsDoc.connections });

  } catch (error) {
    console.error("Error fetching connections:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
});





app.get("/api/student/profile", async (req, res) => {
    try {
        console.log("Incoming request to /profile"); // Log when the request is received
        
        const { userId } = req.query;
        console.log("User ID from request query:", userId); // Log extracted userId

        if (!userId) {
            console.log("Missing userId in request");
            return res.status(400).json({ error: "User ID is required" });
        }

        console.log("Searching for student profile with userId:", userId);
        const student = await StudentProfile.findOne({ userId });

        if (!student) {
            console.log("Student profile not found for userId:", userId);
            return res.status(404).json({ error: "Student profile not found" });
        }

        console.log("Student profile found:", student);
        console.log("data is sent"); // Log the retrieved student profile
        res.json(student);
    } catch (error) {
        console.error("Error fetching student profile:", error);
        res.status(500).json({ error: "Server error" });
    }
});

// Start the server
const port = 8000;
app.listen(port, () => {
    console.log("Server has been started on port", port);
});
