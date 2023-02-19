import { Server, Socket } from "socket.io"
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

// type IUDeviceType = 'WLevel'|'THLevel'

export default async function onDataSend(data:Data,socket:Socket,io:Server){
    try{
        const device = await prisma.device.findUnique({
            where:{
                socketId:socket.id
            },
            include:{
                sensors:true
            }
        })

        if (device == null) throw new Error("Error updating data")

        if (device.type == "IUTH"){
            const typedData = data as THData

            await checkLevels(io,device.userId,socket.id,typedData)

            await prisma.$transaction(async (tx)=>{
                await tx.airHumidity.create({
                    data:{
                        value:typedData.airHumidity,
                        sensorId:device.sensors.filter((sensor)=>sensor.type === "AirHumidity")[0].id
                    }
                })

                await tx.groundHumidity.create({
                    data:{
                        value:typedData.groundHumidity,
                        sensorId:device.sensors.filter((sensor)=>sensor.type === 'GroundHumidity')[0].id
                    }
                })

                await tx.temperature.create({
                    data:{
                        value:typedData.temperature,
                        sensorId:device.sensors.filter((sensor)=>sensor.type === 'Temperature')[0].id
                    }
                })
            })
        }else{
            const typedData = data as WData

            await prisma.h2OLevel.update({
                where:{
                    sensorId:device.sensors.filter((sensor)=>sensor.type === 'WaterLevel')[0].id
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

            if (device.type == "IUTH"){ 
                userSocket!.emit('THLevel',data)
            }else{
                userSocket!.emit('WLevel',data)
            }
        }
    }catch(e){
        throw new Error("Error updating data")
    }
}