// middleware/validate.js
const { ZodError } = require('zod');

const validate = (schema) => async (req, res, next) => {
  try {
    // Parse the incoming request parts
    const validatedData = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Reassign the parsed, coerced, and stripped data back to Express
    req.body = validatedData.body || req.body;
    req.query = validatedData.query || req.query;
    req.params = validatedData.params || req.params;

    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      // Return a structured error response for the frontend
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.issues 
      });
    }
    return res.status(500).json({ error: 'Internal server validation error' });
  }
};

module.exports = { validate };