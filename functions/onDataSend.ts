import { Server } from "socket.io"
import { prisma } from "../prisma/prisma"
import checkLevels from "./checkLevels"

type THData ={
    temperature:number
    airHumidity:number
    groundHumidity:number
}

type WData ={
    isLow:boolean
}

type Data = THData|WData

type IUDeviceType = 'WLevel'|'THLevel'

export default async function onDataSend(data:Data,type:IUDeviceType,socketID:string,io:Server){
    try{
        const device = await prisma.device.findUnique({
            where:{
                socketId:socketID
            }
        })

        if (device == null) throw new Error("Error updating data")

        if (type == "THLevel"){
            const typedData = data as THData

            await prisma.$transaction(async (tx)=>{
                await tx.airHumidity.create({
                    data:{
                        value:typedData.airHumidity,
                        deviceId:device.id
                    }
                })

                await tx.groundHumidity.create({
                    data:{
                        value:typedData.groundHumidity,
                        deviceId:device.id
                    }
                })

                await tx.temperature.create({
                    data:{
                        value:typedData.temperature,
                        deviceId:device.id
                    }
                })
            })
        }else{
            const typedData = data as WData

            await prisma.h2OLevel.update({
                where:{
                    deviceId:device.id
                },
                data:{
                    isLow:typedData.isLow
                }
            })
        }

        const user = await prisma.user.findUnique({
            where:{
                id:device.userId
            }
        })

        if (user == null) throw new Error("Error updating data")

        if (user.socketId!=null){
            const userSocket = io.sockets.sockets.get(user.socketId)

            if (type == "THLevel"){ 
                userSocket!.emit('THLevel',data)
                await checkLevels(io,data as THData,user.id)
            }else{
                userSocket!.emit('WLevel',data)
            }
        }
    }catch(e){
        throw new Error("Error updating data")
    }
}