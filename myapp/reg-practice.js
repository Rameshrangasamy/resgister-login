const express = require('express')
const path = require('path')
const {open} = require('sqlite')
const sqlite3 = require('sqlite3')
const bcrypt = require('bcrypt')

const app = express()
app.use(express.json())
const dbPath = path.join(__dirname, 'userData.db')

let db = null

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Running at http://localhost:3000/')
    })
  } catch (e) {
    console.log(`DB Error: ${e.message}`)
    process.exit(1)
  }
}
initializeDBAndServer()

// Register user API

app.post('/register', async (request, response) => {
  const {username, name, password, gender, location} = request.body

  let lengthOfPwd = password.length
  if (lengthOfPwd < 5) {
    response.status = 400
    response.send('Password is too short')
  } else {
    const hashedPassword = await bcrypt.hash(password, 10)

    const selectUserQuery = `
    SELECT 
    * 
    FROM 
    user 
    WHERE 
    username = '${username}'`
    const dbUser = await db.get(selectUserQuery)

    if (dbUser === undefined) {
      const createUserQuery = `
      INSERT INTO
      user (username, name, password, gender, location)
      VALUES
      (
       '${username}',
       '${name}',
       '${hashedPassword}',
       '${gender}',
       '${location}'  
      );`

      const dbResponse = await db.run(createUserQuery)
      response.send('User created successfully')
    } else {
      response.status = 400
      response.send('User already exists')
    }
  }
})

// Login user API

app.post('/login', async (request, response) => {
  const {username, password} = request.body
  const selectUserQuery = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid User')
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password)
    if (isPasswordMatched === true) {
      response.send('Login success!')
    } else {
      response.status(400)
      response.send('Invalid Password')
    }
  }
})

// PUT Password change API

app.put('/change-password', async (request, response) => {
  const {username, oldPassword, newPassword} = request.body
  const selectUserQuery = `
  SELECT 
    * 
  FROM 
    user 
  WHERE 
    username = '${username}'`
  const dbUser = await db.get(selectUserQuery)

  if (dbUser === undefined) {
    response.status(400)
    response.send('Invalid User')
  } else {
    let lengthOfPwd = newPassword.length
    if (lengthOfPwd < 5) {
      response.status = 400
      response.send('Password is too short')
    } else {
      const isPasswordMatched = await bcrypt.compare(
        oldPassword,
        dbUser.password,
      )
      if (isPasswordMatched === true) {
        const hashedPassword = await bcrypt.hash(newPassword, 10)
        const createUserQuery = `
        UPDATE
        user
        SET
        password = '${hashedPassword}';`

        const dbResponse = await db.run(createUserQuery)
        response.status(200)
        response.send('Password updated')
      } else {
        response.status(400)
        response.send('Invalid current password')
      }
    }
  }
})
module.exports = app;
