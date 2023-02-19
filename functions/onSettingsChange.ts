import { Server, Socket } from "socket.io";
import { prisma } from "../prisma/prisma";

export default async function onSettingsChange(socket:Socket,io:Server, lowAirHumidityLevel:number|undefined,lowGroundHumidityLevel:number|undefined,highTemperatureLevel:number|undefined){
    try{
        const user = await prisma.user.findUnique({
            where:{
                socketId:socket.id
            }
        })

        const settings = await prisma.settings.findUnique({
            where:{
                userId:user!.id
            }
        })

        await prisma.settings.update({
            where:{
                userId:user!.id
            },
            data:{
                lowAirHumidityLevel:typeof(lowAirHumidityLevel)==='string'?lowAirHumidityLevel:settings!.lowAirHumidityLevel,
                lowGroundHumidityLevel:typeof(lowGroundHumidityLevel)==='string'?lowGroundHumidityLevel:settings!.lowGroundHumidityLevel,
                highTemperatureLevel:typeof(highTemperatureLevel)==='string'?highTemperatureLevel:settings!.highTemperatureLevel
            }
        })
    }catch(error){
        console.log(error)
    }
}