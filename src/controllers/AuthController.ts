
import type { Request, Response } from "express";
import bcrypt from 'bcrypt'
import User from "../models/User";
import { checkPassword, hashPassword } from "../utils/utils";
import Token from "../models/Token";
import { generateToken } from "../utils/token";
import { AuthEmail } from "../emails/AuthEmail";
import { token } from "morgan";
export class AuthController {
    static createAccount = async (req: Request, res: Response) => {

        try {
            const { password, email } = req.body

            //Prevenir duplicados
            const userExists = await User.findOne({ email })
            if (userExists) {
                const error = new Error('El Usuario ya esta registrado')
                return res.status(409).json({ error: error.message })

            }

            //Crea un usuario
            const user = new User(req.body)

            //Hash password
            user.password = await hashPassword(password)

            //Generar token
            const token = new Token()
            token.token = generateToken()
            token.user = user.id

            //Enviar EMAIL
            AuthEmail.sendConfirmationEmail({
                email: user.email,
                name: user.name,
                token: token.token
            })

            await Promise.allSettled([user.save(), token.save()])
            res.send('Cuenta creada, revisa tu email para confirmarla')

        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
        }

    }

    static confirmAccount = async (req: Request, res: Response) => {
        try {
            const { token } = req.body;
            const tokenExists = await Token.findOne({ token })

            if (!tokenExists) {
                const error = new Error('Token no valido')
                return res.status(404).json({ error: error.message })
            }

            const user = await User.findById(tokenExists.user)
            user.confirmed = true

            await Promise.allSettled([
                user.save(),
                tokenExists.deleteOne()
            ])

            res.send('Cuenta confirmada correctamente')

        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })

        }

    }

    static login = async (req: Request, res: Response) => {
        try {
            const { email, password } = req.body

            const user = await User.findOne({ email })

            if (!user) {
                const error = new Error('Usuario no encontrado')
                return res.status(404).json({ error: error.message })
            }

            if (!user.confirmed) {
                const token = new Token()
                token.user = user.id
                token.token = generateToken()
                await token.save()

                AuthEmail.sendConfirmationEmail({
                    email: user.email,
                    name: user.name,
                    token: token.token
                })


                const error = new Error('La cuenta no ha sido confirmada, hemos enviado un e-mail de confirmacion')
                return res.status(401).json({ error: error.message })
            }

            //Revisar password
            const isPasswordCorrect = await checkPassword(password, user.password)

            if(!isPasswordCorrect) {
                const error = new Error('Password incorrecto')
                return res.status(401).json({ error: error.message })
            }

            res.send('Autenticado')


        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
        }
    }

    static requestConfirmationCode = async (req: Request, res: Response) => {

        try {
            const { email } = req.body

            //Prevenir duplicados
            const user = await User.findOne({ email })
            if (!user) {
                const error = new Error('El Usuario no esta registrado')
                return res.status(409).json({ error: error.message })
            }

            if(user.confirmed) {
                const error = new Error('El Usuario ya esta confirmado')
                return res.status(403).json({ error: error.message })
            }

            //Generar token
            const token = new Token()
            token.token = generateToken()
            token.user = user.id

            //Enviar EMAIL
            AuthEmail.sendConfirmationEmail({
                email: user.email,
                name: user.name,
                token: token.token
            })

            await Promise.allSettled([user.save(), token.save()])
            res.send('Se envio un nuevo token a tu e-mail')

        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
        }

    }

    static forgotPassword = async (req: Request, res: Response) => {

        try {
            const { email } = req.body

            //Prevenir duplicados
            const user = await User.findOne({ email })
            if (!user) {
                const error = new Error('El Usuario no esta registrado')
                return res.status(409).json({ error: error.message })
            }

            //Generar token
            const token = new Token()
            token.token = generateToken()
            token.user = user.id

            //Enviar EMAIL
            AuthEmail.sendPasswordResetToken({
                email: user.email,
                name: user.name,
                token: token.token
            })


            await token.save()
            res.send('SRevisa tu e-mail para instrucciones')

        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
        }

    }
}