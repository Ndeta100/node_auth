const express=require('express')
const hash=require('pbkdf2-password')
const path =require('path')
const sessions=require('express-session')
const app=express()

module.exports=express()
//config
app.set('view engine', 'ejs')
app.set('views',path.join(__dirname, 'views'))

//middleware
app.use(express.urlencoded({extended:false}))
app.use(sessions({
    resave:false, //Don't save session if unmodified
    saveUninitialized:false, //Don't creat session until something stored
    secret:'shhhh, very secret'
}))

//Session persisted message middleware
app.use(function(req,res,next){
    const err=req.session.error
    const msg=req.session.success
    delete req.session.error
    delete req.session.success
    res.locals.message=''
    if(err) res.locals.message='<p class= "msg error">' + err + '</p>'
    if (msg) res.locals.message='<p class=msg success">' +msg +'</p>'
    next()
})

//dummy data
const users={
    tj:{name:'tj'}
}
//when you create a user, generate a salt
//and hash the password ('foobar' is the pass here)

hash({password:'foobar'}, function(err,pass,salt,hash){
    if(err) throw err
    //store the salt & hash in th db
    users.tj.salt=salt
    users.tj.hash=hash
})

//authenticate using our plan-object database of doom
function authenticate(name, pass, fn){
    if(!module.parent) console.log('Authenticate %s:%s', name, pass)
    const user=users[name]
    //query the db for a given username
    if(!user) return fn(null ,null)
    //apply the saem algorithm to the POST paswsword , applying the hash against the pass / salt, if is a match we found a user
    hash({password:pass, salt:user.salt}, function(err, pass, salt, hash){
        if (err) return fn(err)
        if (hash===user.hash) return fn(null, user)
        fn(null, null)
    })
}

function restrict(req,res,next){
    if(req.session.user){
        next()
    }else{
        req.session.error='Access denied'
        res.redirect('/login')
    }
}

app.get('/', function(req,res){
res.redirect('/login')
})
app.get('/restricted', function(req,res){
    res.send('Whoo! restricted area, click to <a href="logout">logout</a>')
})

app.get('/logout',function(req,res){
    //destroy the user's session to  log them out
    //Will be re-created next request
    req.session.destroy(function(){
        res.redirect('/')
    })
})

app.get('/login',function(req,res){
    res.render('login')
})

app.post('/login', function(req,res, next){
authenticate(req.body.username, req.body.password, function(err, user){
    if(err) return next(err)
    if(user){
        //Regenerate session when signing in
        //prevent fixarion
        req.session.regenerate(function(){
            //store the user's primary key
            //in the session store to be retrieved
            //or in the case th entire user object
            req.session.user=user
            req.session.success='Authenticate as '+ user.name
            + 'click to <a href="/logout">Logout</a>'
            + 'You may now access <a href="/restricted">/restricted</a>'
            res.redirect('back')

        })
    }else{
        req.session.error="Authentication failed, please check your!!!!!! " +
        "username and password" + '(use "tj" and "foobar")'
        res.redirect('/login')
    }
})
})
if(!module.parent){
    app.listen(3000)
    console.log("ExpRess started on port 3000")
}