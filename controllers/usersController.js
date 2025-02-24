const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// @desc Get all users
// @route GET /users
// @access Private
const getAllUsers = asyncHandler(async (req, res) => {
	const users = await User.find().select("-password").lean();
	if (!users?.length) {
		return res.status(400).json({ message: "No users found" });
	}
	res.json(users);
});

// @desc Create a new user
// @route POST /users
// @access Private
const createNewUser = asyncHandler(async (req, res) => {
	const { username, password, roles } = req.body;

	// Confirm data
	if (!username || !password || !Array.isArray(roles) || !roles.length) {
		return res.status(400).json({ message: "All fields are required" });
	}

	// Check for duplicate
	const duplicate = await User.findOne({
		username: { $regex: username, $options: "i" },
	})
		.lean()
		.exec();
	if (duplicate) {
		return res.status(409).json({ message: "Duplicate username" });
	}

	// Hash password
	const hashedPwd = await bcrypt.hash(password, 10);
	const userObject = { username, password: hashedPwd, roles };

	// Create and store new user
	const user = await User.create(userObject);

	if (user) {
		//created
		res.status(201).json({ message: `New user ${username} created` });
	} else {
		// error
		res.status(400).json({ message: "Invalid user data received" });
	}
});

// @desc Update a user
// @route PATCH /users
// @access Private
const updateUser = asyncHandler(async (req, res) => {
	const { id, username, roles, active, password } = req.body;

	// Verify data integrity
	if (
		!id ||
		!username ||
		!Array.isArray(roles) ||
		!roles.length ||
		typeof active !== "boolean"
	) {
		return res.status(400).json({ message: "All fields are required" });
	}

	// See if user exists before we try updating
	const user = await User.findById(id).exec();

	if (!user) {
		return res.status(400).json({ message: "User not found" });
	}

	// Check if username already exists
	const duplicate = await User.findOne({
		username: { $regex: username, $options: "i" },
	})
		.lean()
		.exec();
	// Check if duplicate isn't the current user
	if (duplicate && duplicate?._id.toString() !== id) {
		return res.status(409).json({ message: "Duplicate username" });
	}

	user.username = username;
	user.roles = roles;
	user.active = active;

	if (password) {
		const hashedPwd = await bcrypt.hash(password, 10);
		user.password = hashedPwd;
	}

	const updatedUser = await user.save();

	res.json({ message: `${updatedUser.username} updated` });
});

// @desc Delete a user
// @route DELETE /users
// @access Private
const deleteUser = asyncHandler(async (req, res) => {
	const { id } = req.body;

	// Verify data integrity
	if (!id) {
		return res.status(400).json({ message: "User ID required" });
	}

	// Check if user has notes
	const hasNotes = await Note.findOne({ user: id }).lean().exec();

	if (hasNotes) {
		return res.status(400).json({ message: "User has assigned notes" });
	}

	// Check if user exists before we try deleting
	const user = await User.findById(id).exec();

	if (!user) {
		return res.status(400).json({ message: "User not found" });
	}

	const result = await user.deleteOne().exec();

	const reply = `User with ID ${id} deleted`;

	res.json(reply);
});

module.exports = {
	getAllUsers,
	createNewUser,
	updateUser,
	deleteUser,
};
