import { Server } from "socket.io";
import { prisma } from "../prisma/prisma";

type THData ={
    temperature:number
    airHumidity:number
    groundHumidity:number
}

export default async function checkLevels(io:Server,userId:string,IUSocketId:string,value:THData){
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
            },
            include:{
                sensors:true
            }
        })

        const IUDevices = await prisma.device.findMany({
            where:{
                OR:[
                    {
                        type:'IUW'
                    },
                    {
                        type:'IUTH'
                    }
                ],
                userId:userId,
                NOT:{
                    socketId:IUSocketId
                }
            },
            include:{
                sensors:{
                    include:{
                        H2OLevel:true,
                        airHumidities:true,
                        groundHumidities:true,
                        temperatures:true,
                    }
                }
            }
        })

        if (IUDevices.length === 0) throw new Error("No IUDevices found")

        const CUTDevices = cDevices.filter((device)=>device.type=='CUT')
        const CUWDevices = cDevices.filter((device)=>device.type=='CUW')

        const TSensor = IUDevices.filter((device)=>device.type=='IUTH')[0].sensors.filter((sensor)=>sensor.type=='Temperature')[0]
        const GHSensor = IUDevices.filter((device)=>device.type=='IUTH')[0].sensors.filter((sensor)=>sensor.type=='GroundHumidity')[0]
        const AHSensor = IUDevices.filter((device)=>device.type=='IUTH')[0].sensors.filter((sensor)=>sensor.type=='AirHumidity')[0]
        // const WLSensor = IUDevices.filter((device)=>device.type=='IUW')[0].sensors[0]

        const temperatureMetric = TSensor.isWorking ? TSensor.temperatures[0]:null
        const airHumidityMetric = AHSensor.isWorking ? AHSensor.airHumidities[0]:null
        const groundHumidityMetric = GHSensor.isWorking ? GHSensor.groundHumidities[0]:null
        // const waterLevelMetric = WLSensor.isWorking ? WLSensor.H2OLevel:null

        if (temperatureMetric == null) throw new Error("No metric found")
        if (airHumidityMetric == null) throw new Error("No metric found")
        if (groundHumidityMetric == null) throw new Error("No metric found")

        // const now = new Date()

        // const deltaT = (now.getTime() - temperatureMetric.timestamp.getTime()) / 1000
        // const deltaGH = (now.getTime() - groundHumidityMetric.timestamp.getTime()) / 1000
        // const deltaAH = (now.getTime() - airHumidityMetric.timestamp.getTime()) / 1000

        const srT =  temperatureMetric ===null ? value.temperature : (temperatureMetric.value+value.temperature)/2
        if (settings!.highTemperatureLevel < srT){
            CUTDevices.forEach((device)=>{
                if (device.socketId!=null){
                    const socket = io.sockets.sockets.get(device.socketId)

                    socket!.emit("HighTemperature","Open window")
                }
            })
        }else{
            CUTDevices.forEach((device)=>{
                if (device.socketId!=null){
                    const socket = io.sockets.sockets.get(device.socketId)

                    socket!.emit("LowTemperature","Open window")
                }
            })
        }

        const srAH =  airHumidityMetric ===null ? value.airHumidity : (airHumidityMetric.value+value.airHumidity)/2
        if (settings!.highTemperatureLevel < srAH){
            CUTDevices.forEach((device)=>{
                if (device.socketId!=null){
                    const socket = io.sockets.sockets.get(device.socketId)

                    socket!.emit("LowAirHumidity","Turn on air humidifier")
                }
            })
        }

        const srGH =  groundHumidityMetric ===null ? value.groundHumidity : (groundHumidityMetric.value+value.groundHumidity)/2
        if (settings!.highTemperatureLevel < srGH){
            CUWDevices.forEach((device)=>{
                if (device.socketId!=null){
                    const socket = io.sockets.sockets.get(device.socketId)

                    socket!.emit("LowGroundHumidity","Turn on waterer")
                }
            })
        }
    }catch(e){
        console.log(e)
    }
}