const express = require('express');
const cors = require('cors');
const clarifai = require('clarifai');
const bcrypt = require('bcrypt-nodejs');
const knex = require('knex')({
    client: 'pg',
    connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: true,
    }
});

const app = express();
app.use(express.json());
app.use(cors());

app.listen(process.env.PORT || 3000, () => {
    console.log('app running')

})

app.get('/', (req, res) => {


    res.send('ok');
})

/*
/signin -> post
/register -> post
/profile/:id -> get
/image put

*/
app.post('/register', (req, res) => {
    const { name, email, password } = req.body;

    const hash = bcrypt.hashSync(password);
    knex.transaction(trx => {
        return trx('login')
            .insert({
                login_email: email,
                login_hash: hash
            })
            .then(() => {
                return trx('users')
                    .returning('*')
                    .insert({
                        user_name: name,
                        user_email: email,
                        user_creation_date: new Date()
                    }).then(user => res.json(user[0]))
            }
            ).then(trx.commit)
            .catch(trx.rollback)
    })

        .catch(err => {
            console.log(err)
            res.status(400).json(err)
        });


})

app.post('/signin', (req, res) => {
    const user = req.body;


    knex.select('*').from('login')
        .where({ login_email: req.body.email })
        .then(data => data[0])
        .then(login => {
            if (bcrypt.compareSync(req.body.password, login.login_hash)) {
                knex.select('user_id', 'user_email', 'user_entries', 'user_name').from('users').where({ user_email: req.body.email })
                    .then(data => res.json(data[0]))

            }
            else {
                res.status(400).json('invalid password');
            }


        })
}
)


app.put('/increment', (req, res) => {
    // body should contain { 'id' :  userId}


    knex('users')
        .where({ user_id: req.body.id })
        .increment('user_entries', 1)
        .returning('user_entries')
        .then(data => res.json(data[0]))
        .catch(err => console.log(err))

})

app.get('/count/:id', (req, res) => {
    const { id } = req.params;

    knex.select('*').from('users')
        .where({ user_id: id })
        .then(data => res.json(data[0].user_entries));

})


const faceApi = new Clarifai.App({
    apiKey: '53f40403b6db47b4b55ca309b9255e3a'
});

app.post('/detect', (req, res) => {
    const  url  = req.body.url;
   
    faceApi.models.predict("a403429f2ddf4b49b307e318f00e528b", url)
        .then(response => res.json(response.outputs[0].data.regions));
})




