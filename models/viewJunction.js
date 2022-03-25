const Sequelize = require("sequelize");
const sequelize = require("../util/database")

const ViewJunction = sequelize.define("view", {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true,
    },
    user: {
        type: Sequelize.INTEGER,
        allowNull: false,
    },
    post:{
        type: Sequelize.INTEGER,
        allowNull: false
    }

});

module.exports = ViewJunction;