const {body, validationResult} = require("express-validator")
const Book = require("../models/book")
const BookInstance = require("../models/bookinstance");
const asyncHandler = require("express-async-handler");

// Display list of all BookInstances
exports.bookinstance_list = asyncHandler(async (req, res, next) => {
    const allBookInstances = await BookInstance.find().populate("book").exec();

    res.render("bookinstance_list",{
        title: "Book Instance List",
        bookinstance_list: allBookInstances
    });
});

// Display detail page for a specific BookInstance
exports.bookinstance_detail = asyncHandler(async (req, res, next) => {
    const bookInstance = await BookInstance.findById(req.params.id).populate("book").exec();

    if (bookInstance === null) {
        // No results
        const err = new Error("Book copy not found");
        err.status = 404;
        return next(err);
    }

    res.render("bookInstance_detail", {
        title: "Book",
        bookinstance: bookInstance
    });
});

// Display BookInatance create form on GET
exports.bookinstance_create_get = asyncHandler(async (req, res, next) => {
    const allBooks = await Book.find({}, "title").sort({title: 1}).exec();

    res.render("bookinstance_form", {
        title: "Create BookInstance",
        book_list: allBooks
    });
});

// Handle BookInstance create on POST
exports.bookinstance_create_post = [
    // Validate and sanitize fields
    body("book", "Book must be specified").trim().isLength({min: 1}).escape(),
    body("imprint", "Imprint must be specified").trim().isLength({min: 1}).escape(),
    body("status").escape(),
    body("due_back", "Invalid date").optional({values: "falsy"}).isISO8601().toDate(),

    // Process request after validation and sanitization
    asyncHandler(async (req, res, next) => {
        // Extract the validation errors from a request
        const errors = validationResult(req);

        // Create a BookInstance object with escape and trimed data
        const bookInstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
        });

        if (!errors) {
            // There are errors
            // Render form again with sanitoized values and error messages
            const allBooks = await Book.find({}, "titles").sort({titles: 1}).exec();

            res.render("bookinstance_form", {
                title: "Create BookInstance",
                book_list: allBooks,
                selected_book: bookInstance.book._id,
                errors: errors.array(),
                bookinstance: bookInstance
            });
            return;
        } else {
            // Data from form is valid
            await bookInstance.save();
            res.redirect(bookInstance.url)
        }
    })
]

// Display BookInstance delete form on GET
exports.bookinstance_delete_get = asyncHandler(async (req, res, next) =>{
    // Get details of BookInstances
    const bookInstance = await BookInstance.findById(req.params.id).populate({path: "book", select: "title isbn"}).exec();
    const book_status = bookInstance.status === "Loaned" ? false : true

    if (bookInstance === null) {
        // No results
        res.redirect("/catalog/books")
    }

    res.render("bookinstance_delete", {
        title: "Delete Book Instance",
        bookinstance: bookInstance,
        book_status: book_status
    });
});

// Handle BookInstance delete on Post
exports.bookinstance_delete_post = asyncHandler(async (req, res, next) => {
    // Get details of BookInstances
    const bookInstance = await BookInstance.findById(req.params.id).populate({path: "book", select: "title isbn"}).exec();
    const book_status = bookInstance.status === "Loaned" ? false : true

    if (!book_status) { 
        // book not returned to library
        res.render("bookinstance_delete", {
            title: "Delete Book Instance",
            bookinstance: bookInstance,
            book_status: book_status
        });
        return;
    }
    
    // Delete object and redirect to the list of BookInstances
    await BookInstance.findByIdAndDelete(req.body.bookinstance_id);
    res.redirect("/catalog/bookinstances");
});

// Display BookInstance update form on GET
exports.bookinstance_update_get = asyncHandler(async (req, res, next) => {
    // Get details of bookInstance and book
    const [bookInstance, allBooks] = await Promise.all([
        BookInstance.findById(req.params.id).exec(),
        Book.find().sort({title: 1}).exec()
    ])

    if (bookInstance === null) {
        // No results
        const err = new Error("Book Instance not found.")
        err.status = 404;
        return next(err);
    }

    res.render("bookinstance_form", {
        title: "Update Book Instance",
        bookinstance: bookInstance,
        selected_book: bookInstance.book,
        book_list: allBooks
    });
});

// Handle bookinstance update on POST
exports.bookinstance_update_post = [
    // Validate and sanitize fields
    body("book", "Book must be specified").trim().isLength({min: 1}).escape(),
    body("imprint", "Imprint must be specified").trim().isLength({min: 1}).escape(),
    body("status").escape(),
    body("due_back", "Invalid date").optional({values: "falsy"}).isISO8601().toDate(),

    // Process request after validation and sanitization
    asyncHandler(async (req, res, next) => {
        // Extract the validation errors from a request
        const errors = validationResult(req);

        // Create a GenreInstance object with escaped/trimmed data and old id
        const bookInstance = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back,
            _id: req.params.id
        });

        if (!errors.isEmpty()) {
            // There are errors. 

            // Get details of allBooks
            const allBooks = await BookInstance.find().sort({title: 1}).exec();

            // Render for again sanitized values/error messages
            res.render("bookInstance", {
                title: "Update Book Instance",
                bookinstance: bookInstance,
                selected_book: bookInstance.book._id,
                book_list: allBooks
            })
        } else {
            // Data from form valid. Update the record.
            await BookInstance.findByIdAndUpdate(req.params.id, bookInstance, {});

            // Redirect to bookInstance detail page
            res.redirect(bookInstance.url);
        }
    })
]