const Sequelize = require("sequelize");
const sequelize = require("../util/database")

const Post = sequelize.define("post", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    user:{
        type: Sequelize.STRING,
        allowNull: false
    },
    img: {
        type: Sequelize.STRING,
        allowNull: true
    },
    postText: {
        type: Sequelize.STRING,
        allowNull: true
    },
})

module.exports = Post;