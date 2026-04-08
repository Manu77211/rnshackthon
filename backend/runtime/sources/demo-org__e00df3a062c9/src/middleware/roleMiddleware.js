const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: "Unauthorized",
      code: 401,
      detail: "Authentication is required",
    });
  }

  if (!roles.includes(req.user.role)) {
    return res.status(403).json({
      error: "Forbidden",
      code: 403,
      detail: "You do not have permission to access this resource",
    });
  }

  return next();
};

module.exports = { allowRoles };
