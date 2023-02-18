import { Server } from "socket.io";
import { prisma } from "../prisma/prisma";

type THData ={
    temperature:number
    airHumidity:number
    groundHumidity:number
}

export default async function checkLevels(io:Server,data:THData,userId:string,IUSocketId:string){
    try{
        const settings = await prisma.settings.findUnique({
            where:{
                id:userId
            }
        })

        
        const cDevices = await prisma.device.findMany({
            where:{
                OR:[
                    {
                        type:"CUT"
                    },
                    {
                        type:"CUW"
                    }
                ],
                userId:userId
            }
        })

        const IUDevice = await prisma.device.findFirst({
            where:{
                type:"IU",
                userId:userId,
                NOT:{
                    socketId:IUSocketId
                }
            }
        })

        if (IUDevice == null) throw new Error("No IUDevices found")

        const CUTDevices = cDevices.filter((device)=>device.type=='CUT')
        const CUWDevices = cDevices.filter((device)=>device.type=='CUW')

        const temperatureMetric = await prisma.temperature.findFirst({
            where:{
                deviceId:IUDevice.id
            }
        })

        const airHumidityMetric = await prisma.airHumidity.findFirst({
            where:{
                deviceId:IUDevice.id
            }
        })
        
        const groundHumidityMetric = await prisma.groundHumidity.findFirst({
            where:{
                deviceId:IUDevice.id
            }
        })

        if (temperatureMetric == null) throw new Error("No metric found")
        if (airHumidityMetric == null) throw new Error("No metric found")
        if (groundHumidityMetric == null) throw new Error("No metric found")

        const now = new Date()

        const deltaT = (now.getTime() - temperatureMetric.timestamp.getTime()) / 1000
        const deltaGH = (now.getTime() - groundHumidityMetric.timestamp.getTime()) / 1000
        const deltaAH = (now.getTime() - airHumidityMetric.timestamp.getTime()) / 1000

        if (settings!.highTemperatureLevel < ((data.temperature+temperatureMetric.value)/2) && deltaT<50){
            CUTDevices.forEach((device)=>{
                if (device.socketId!=null){
                    const socket = io.sockets.sockets.get(device.socketId)

                    socket!.emit("HighTemperature","Open window")
                }
            })
        }else if (settings!.highTemperatureLevel > ((data.temperature+temperatureMetric.value)/2) && deltaT<50){
            CUTDevices.forEach((device)=>{
                if (device.socketId!=null){
                    const socket = io.sockets.sockets.get(device.socketId)

                    socket!.emit("LowTemperature","Close window")
                }
            })
        }

        if (settings!.lowAirHumidityLevel < ((data.airHumidity+airHumidityMetric.value)/2) && deltaAH<50){
            CUWDevices.forEach((device)=>{
                if (device.socketId!=null){
                    const socket = io.sockets.sockets.get(device.socketId)

                    socket!.emit("LowAirHumidity","Turn on air humidifier")
                }
            })
        }

        if (settings!.lowGroundHumidityLevel < ((data.groundHumidity+groundHumidityMetric.value)/2) && deltaGH<50){
            CUWDevices.forEach((device)=>{
                if (device.socketId!=null){
                    const socket = io.sockets.sockets.get(device.socketId)

                    socket!.emit("LowGroundHumidity","Turn on air waterer")
                }
            })
        } 
    }catch(e){
        console.log(e)
    }
}