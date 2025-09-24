import cors from 'cors'
import express from 'express'

const PORT = 5050
const APP = express()

APP.listen(PORT,()=>{
    console.log("Hola")
})
