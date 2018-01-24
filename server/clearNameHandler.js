
module.exports = () => {
  return (req, res, next) => {
    if (req.query.name === 'clear') {
      res.cookie('username', '');
      delete req.query.name;
      delete req.cookies.username;
    }
    next();
  };
};
