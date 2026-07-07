const Joi = require('joi');

/**
 * Express 中间件工厂：用 Joi 校验 req.body / req.query / req.params
 * @param {Joi.ObjectSchema} schema
 * @param {'body'|'query'|'params'} source
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
    }
    req[source] = value;
    next();
  };
}

// ── 常用 schema ─────────────────────────────────────────────

const schemas = {
  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(128).required(),
  }),

  resetPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  updatePassword: Joi.object({
    password: Joi.string().min(6).max(128).required(),
  }),

  noticeQuery: Joi.object({
    level: Joi.string().valid('strong', 'yes', 'risky', 'no'),
    city: Joi.string().max(50),
    days: Joi.string().pattern(/^\d+$/),
    access: Joi.string().valid('unknown', 'free', 'paid', 'registration_required'),
    page: Joi.string().pattern(/^\d+$/),
    keyword: Joi.string().max(200),
    status: Joi.string().valid('new', 'following', 'ignored', 'bidding', 'won', 'lost'),
  }),

  qualBody: Joi.object({
    type: Joi.string().max(100).required(),
    name: Joi.string().max(200).required(),
    level: Joi.string().max(100),
    cert: Joi.string().max(100),
    expiry: Joi.string().isoDate(),
  }),

  contractBody: Joi.object({
    project_name: Joi.string().max(300).required(),
    industry: Joi.string().max(100),
    service_type: Joi.string().max(100),
    amount: Joi.number().min(0),
    start_date: Joi.string().isoDate(),
    end_date: Joi.string().isoDate(),
  }),

  pagination: Joi.object({
    page: Joi.string().pattern(/^\d+$/).default('1'),
    limit: Joi.string().pattern(/^\d+$/).default('20'),
  }),
};

module.exports = { validate, schemas };
