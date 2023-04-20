import {React, useEffect, useState, useContext, useCallback} from 'react'
import UserContext from '../Context/UserContext';
import {loginService,getUserInfoService,registerService,updateService} from '../services/user';
import ws_connect from '../services/ws';

export function useUser(){

    const {user,setUser}=useContext(UserContext)
    const [socket,setSocket]=useState(null)
    const [loading,setLoading]=useState(false)

    /**************************************************************************************
     * verify if there is an existing access token in localStorage
     * If there is a token then gets user info.
     */
    useEffect(()=>{  
        let token=localStorage.getItem('access_token')
        if(token){ //if there is a previos token then gets user info
          console.log('access_token found in localStorage\nGetting user info...')
          getUserInfo(token)
          }
      } 
      ,
      []
    )

    /**************************************************************************************
     * Log in user by username and password
     * If success stores access token in user.access_token and 
     * username in user.username
     * @param {String} username
     * @param {String} password
     */
    const userLogin=useCallback(async (username,password)=>{
      console.log(username,password)
      try{
        let token=await loginService(username,password)

        if (!token) throw new Error('Failed to log in')

        console.log('logged in: ')
        
        //Get user info
        await getUserInfo(token)
        localStorage.setItem('access_token',token)

        // Connect to SocketIO server
        let ws=ws_connect(token)
        setSocket(ws)
        ws.emit('join',{username:username,room:'1234'})
        
      }
      catch(err){
        alert('user or password incorrect')
        setUser({...user,username:'', accessToken:null})
        console.log('failed to login: ',err)
      }
        
    },
    [user,socket]
    )


    /**************************************************************************************
     * Register new user 
     * @param {String} username
     * @param {String} password
     * @param {String} email
     */
        const userRegister=useCallback((username,password,email)=>{
          console.log('Register new user: '+username)
          setLoading(true)
          registerService(username,password,email)
          .then(res => {
              if (!res) throw new Error('Failed to register')
              console.log('New user created ')
              console.log('Logging in new user...')
              // Log in new user
              userLogin(username,password)
          })
          .catch(err=>{
              console.log('failed to crea new user')
          })
          setLoading(false)
      },
      []
      )

    /**************************************************************************************
     * Update user data
     * @param {String} password
     * @param {String} email
     */
          const userUpdate=useCallback(async (password,email)=>{
            console.log('Updating user data:' ,user.username)
            setLoading(true)
            updateService(user.accessToken,user.username,password,email)
            .then(res => {
                console.log(res)
                if (!res) throw new Error('Failed to update')
                console.log('User data updated ')
                setUser({...user,email,password})
            })
            .catch(err=>{
                console.log(err)
            })
            setLoading(false)
        },
        [user]
        )

    /**************************************************************************************
     * Gets current user information and stores it in user
     * If fails to get user information then logout user
     */
    const getUserInfo=useCallback(async (accessToken)=>{
      setLoading(true)
      try{        
        let u=await getUserInfoService(accessToken)
        console.log('user data:',u)
        if(u?.username){
          setUser({...user,...u,accessToken})
        }
      }
      catch(err){
        console.log(err)
        userLogout()//if failed to get user info then logout user
      }
      setLoading(false)
    },
    [user])



    /**************************************************************************************
     * Log out user by deleting token from localStorage and user.access_token
     * user.username is set to ''
     */
    const userLogout=useCallback(()=>{
      console.log('log out')
      setUser({...user,username:'',accessToken:null})
      localStorage.setItem('access_token','')
    },
    [user])


    return (
      {
        login: userLogin,
        register:userRegister,
        logout: userLogout,
        updateUser: userUpdate,
        socket:socket,
        user: user,
        loading:loading
      }
      
    )
  }
