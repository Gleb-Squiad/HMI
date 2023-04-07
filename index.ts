import { AirHumidity, GroundHumidity, SensorType, Temperature } from '@prisma/client';
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import OnSocketConnect from './functions/onConnect';
import onDataSend from './functions/onDataSend';
import onSocketDisconnect from './functions/onDisconnect';
import onSettingsChange from './functions/onSettingsChange';
import { prisma } from './prisma/prisma';

enum DeviceType{
  "User",
  "IOT"
}

type SensorObj = {
  id:string
  isWorking: boolean
  type: SensorType
}

const app: Express = express();
const server = createServer(app);
const io = new Server(server)

const port = 3000;

io.on('connection', async (socket) =>{
  socket.on('disconnect',async (data)=>{
      console.log('disconnecting')
      await onSocketDisconnect(socket.id)
  })

  socket.on('change_settings',async (data)=>{
    await onSettingsChange(socket,io,data.lowAirHumidityLevel,data.lowGroundHumidityLevel,data.highTemperatureLevel)
  })

  socket.on('change_data',async (data)=>{
    await onDataSend(data,socket,io)
  })

  const deviceType = socket.handshake.query.type;
  const token = socket.handshake.headers.authorization;
  console.log(token,deviceType)

  if (typeof(token)!=='string' || typeof(deviceType)!=='string'){
    socket.disconnect()
  }

  let socketArray = undefined 
  
  if (deviceType!=='User'){
    if (typeof(socket.handshake.query.sensors)!=='string'){
      socket.disconnect()
    }
    
    const sensors = socket.handshake.query.sensors as string;

    if (!sensors.includes(',')){
      socket.disconnect()
    }

    socketArray = sensors.split(',')
  }

  await OnSocketConnect(token as string,deviceType==='User'?DeviceType.User:DeviceType.IOT,socket,socketArray)

  if (deviceType === 'User'){
    const data = await prisma.user.findUnique({
      where:{
        API_TOKEN:token
      },
      include:{
        devices:{
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
        }
      }
      
    })

    let airHumidities:AirHumidity[] = []
    let groundHumidities:GroundHumidity[] = []
    let temperatures:Temperature[] = []
    let waterLevel = undefined
    let sensors:SensorObj[] = []

    data?.devices.forEach((device)=>{
      device.sensors.forEach((sensor)=>{
        airHumidities = airHumidities.concat(sensor.airHumidities)
        groundHumidities = groundHumidities.concat(sensor.groundHumidities)
        waterLevel = waterLevel = sensor.H2OLevel?.isLow
        temperatures = temperatures.concat(sensor.temperatures)

        const sensorObj = {
          id:sensor.id,
          isWorking: sensor.isWorking,
          type: sensor.type
        }

        sensors.push(sensorObj)
      })
    })

    io.emit("Data",{
      airHumidities:airHumidities,
      groundHumidities:groundHumidities,
      temperatures:temperatures,
      waterLevel:waterLevel,
      sensors:sensors
    })
  }
})

app.get('/', (req: Request, res: Response) => {
  res.send('');
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});