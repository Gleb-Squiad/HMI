import { AirHumidity, GroundHumidity, Log, Temperature } from '@prisma/client';
import express, { Express, Request, Response } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import OnSocketConnect from './functions/onConnect';
import onSocketDisconnect from './functions/onDisconnect';
import { prisma } from './prisma/prisma';

enum DeviceType{
  "User",
  "IOT"
}

const app: Express = express();
const server = createServer(app);
const io = new Server(server)

const port = 3000;

io.on('connection', async (socket) =>{
  socket.on('disconnect',(data)=>{
      onSocketDisconnect(socket.id)
  })

  const deviceType = socket.handshake.query.type;
  const token = socket.handshake.headers.authorization;
  console.log(token,deviceType)

  if (typeof(token)!=='string' || typeof(deviceType)!=='string'){
    socket.disconnect()
  }

  await OnSocketConnect(token as string,deviceType==='User'?DeviceType.User:DeviceType.IOT,socket.id)

  if (deviceType === 'User'){
    const data = await prisma.user.findUnique({
      where:{
        API_TOKEN:token
      },
      include:{
        devices:{
          include:{
            H2OLevel:true,
            airHumidities:true,
            groundHumidities:true,
            temperatures:true,
            logs:true
          }
        }
      }
      
    })

    let airHumidities:AirHumidity[] = []
    let groundHumidities:GroundHumidity[] = []
    let temperatures:Temperature[] = []
    let waterLevel = undefined
    let logs:Log[] = []

    data?.devices.forEach((device)=>{
      airHumidities = airHumidities.concat(device.airHumidities)
      groundHumidities = groundHumidities.concat(device.groundHumidities)
      waterLevel = waterLevel = device.H2OLevel?.isLow
      logs = logs.concat(device.logs)
      temperatures = temperatures.concat(device.temperatures)
    })

    io.emit("Data",{
      airHumidities:airHumidities,
      groundHumidities:groundHumidities,
      temperatures:temperatures,
      waterLevel:waterLevel,
      logs:logs
    })
  }
  
})

app.get('/', (req: Request, res: Response) => {
  res.send('');
});

server.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});