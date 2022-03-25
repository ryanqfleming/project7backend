const express = require("express");
require("dotenv").config();
const multer = require("multer");
const bcrypt = require("bcrypt");
let http = require("http");
console.log('backend running')
const cors = require('cors');
const sequelize = require("./util/database");
const User = require("./models/user");
const Post = require("./models/post");
const ViewJunction = require("./models/viewJunction")
const jwt = require("jsonwebtoken");
const { resolve } = require("path");
const { del } = require("express/lib/application");
const app = express();
app.use(cors());
app.use(express.static('public'));
app.use('/images', express.static(__dirname + '/images'));
//enabled for testing ONLY -- security risk
app.use(cors())
app.use(express.json());
//multer middleware
const fileStorageEngine = multer.diskStorage({
    destination: (req, file, cb) =>{
        cb(null, "./images")
    },
    filename: (req, file, cb) => {
        cb(null,Math.floor(Math.random() * 1000000) + "--" + file.originalname)
    }
})
const upload = multer({ storage: fileStorageEngine})
//
User.hasMany(Post);
//posts is used across a few functions and needs to be persistant 
let posts = [];

//creating the post
app.post("/makePost", authenticateToken, upload.single('file'),(req, res)=>{
    sequelize.sync().then(result=>{
        return User.findOne({where:{id: req.user}})
    }).then(result=>{
        const userPull = result.email.split('@')
        const userName = userPull[0]
        //checking to see if user posted image with text
        if(req.body.hasImage === false){
            return Post.create({user: userName, postText: req.body.message, userId: req.user})
        } else {
            return Post.create({user: userName,img: req.body.server + "/images/" + req.file.filename, postText: req.body.message, userId: req.user})
        }
    })
    .then(result=>{
        res.send('woot')
    })
})
//when a user views a post, log it
app.post("/view", authenticateToken,(req, res)=>{
    sequelize.sync().then(result=>{
        return ViewJunction.create({user: req.user, post: req.body.post})
    }).then(result=>{
        res.send('woop')
    })
})
//geting posts for home page
app.post("/posts", authenticateToken, (req, res)=>{
    let tier = req.body.tier 
     if(tier == 0 || tier % 10 == 0)  {
    let filteredPosts = sortPosts(tier,req.user);
    filteredPosts.then(result=>{
        res.send(getNextTen(result, tier))
    })
     } else {
           res.send(getNextTen(posts, tier))
     }
})
//returns 10 posts 
function getNextTen(result, tier){
        let trueTier = tier.toString()
        trueTier = trueTier.slice(trueTier.length - 1)
        const getTen = result.slice(trueTier*10, trueTier*10+10)
        return getTen
}
//make a new user
app.post("/createUser",(req,res)=>{
    sequelize.sync().then(result=>{
        console.log('the req ',req.body)
        return User.findOne({where: {email: req.body.user}})
    }).then(userCheck=>{
        console.log('usercheck: ',userCheck,'type: ', typeof userCheck)
        //check if email exists
        if(userCheck !== null){
            throw new Error('Account Already Exists. If you cannot login please contact the system admin')
        } else {
        //not null lets secure the password and save to database
        bcrypt.genSalt(12).then((salt)=>{
            bcrypt.hash(req.body.password, salt).then((hash)=>{
                return User.create({email: req.body.user, password: hash})
            }).then(result=>{
                return User.findOne({where:{email: req.body.user}}).then(results=>{
                const token = jwt.sign(results.id, process.env.ACCESS_TOKEN)
                res.json({userid: results.id, token: token})
        })
            })
        })
        }
    })
    .catch(err=>{
        res.send(err.message)
        console.error(err)
    })
})
//deletes the user and all their content
app.post("/delete", authenticateToken,(req,res)=>{
    console.log('delelet account')
    res.send('delete account')
    //delete all of users posts
    sequelize.sync().then(result=>{
         const postsRemoves = Post.destroy({
        where: {userId: req.user}
    })
    //removes user
    postsRemoves.then(result=>{
        const userRemove = User.destroy({
            where: {id: req.user}
        })
        //removes their views
        userRemove.then(result=>{
            const viewRemover = ViewJunction.destroy({
                where: {user: req.user}
            })
        })
    })
    })
   

})
//User login
app.post("/login",(req,res)=>{
    console.log("login called:", req.body)
    sequelize.sync().then(result=>{
        return User.findOne({where: {email: req.body.user}})
    }).then(userCheck=>{
        if(userCheck === null){
            throw new Error('Please create an account')
        } else {
            bcrypt.compare(req.body.password, userCheck.password).then((compared)=>{
                if(compared ==false){
                    res.send("Incorrect Password");
                } else {
                    //create jwt
                    const token = jwt.sign(userCheck.id, process.env.ACCESS_TOKEN)
                    res.json({userid: userCheck.id, token: token})
                }
            })
        }
    })
    .catch(err=>{
        res.send(err.message)
    })
})
//use this when making posts because not only does it validate but also returns which user is logged in
app.post("/authenticate", authenticateToken, (req,res)=>{
    res.send("true")
})
//purpose is to filter posts so the user gets the posts they viewed last, out of a set of 100
//so we will pull 100 posts, seperate out the viewed ones and append them to the end of the array with an added object item so we can idenify and style on the front end
let sortPosts = function(tier, userId){
    //adding a check so we don't fire anything that grabs posts while this is running
    postcheck = false
    console.log(tier,'in sort posts')
        return getPosts(tier).then(postReturn=>{
            return sequelize.sync().then(result=>{
                return ViewJunction.findAll(
                    {
                    where: {
                    user: userId
                    },
                }
                )
            }).then(viewReturn=>{
                //filter into viewed and unviewed using views table and then append unviewed onto the end of viewed after adding true or false for front end styling
                //prob some grokking thingy to do this faster but it works for now
                const viewedPosts = postReturn.filter((item)=>{return viewReturn.find(({post}) => item.id === post)})
                const unviewedPosts = postReturn.filter((item)=>{return !viewReturn.find(({post}) => item.id === post)})
                viewedPosts.forEach(item =>{item.dataValues.viewed = "true"})
                unviewedPosts.forEach(item =>{item.dataValues.viewed = "false"})
                const filteredPosts = unviewedPosts.concat(viewedPosts)
                
               posts = filteredPosts
               postCheck= true
              return filteredPosts
            });
    }) 
    
}
//pull 100 posts using offset, set by tier
const getPosts = async (tier) =>{return sequelize.sync().then(res=>{return Post.findAll({order:[['id', 'DESC']],limit: 100,offset: tier*100})}).then(result=>{return result})}

//authenticate Token
async function authenticateToken(req,res,next){
     console.log("called token")
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(" ")[1];
    console.log("the token", token)
    if(token == null) return res.send("false");
    jwt.verify(token, process.env.ACCESS_TOKEN, (err, userId)=>{
        if (err != null) {
            console.log('triggered erro', err)
             res.send("false");
        }
             req.user = userId;
             next()
    })
    
}

app.listen(3000)