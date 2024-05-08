const http = require('http');
const fs = require('fs');
const url = require('url');
const path = require('path');

const port = 3000;

const server = http.createServer((req, res) => {
  const queryObject = url.parse(req.url, true).query;
  const id = queryObject.id;
  const startDate = queryObject.startDate;
  const endDate = queryObject.endDate;
  



  if (id && startDate && endDate) {
    const csvFilePath = path.join(__dirname, 'data', 'device-saving.csv');
    fs.readFile(csvFilePath, 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading CSV file:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
        return;
      }

      const lines = data.split('\n');
      const filteredLines = lines.slice(1).filter(line => line.startsWith(id + ','));
     
      const carbon_saved = [];
      const fuel_saved = [];

      filteredLines.forEach(line => {
        const values = line.split(',');
        if (values.length >= 5) {
          carbon_saved.push(Number(values[3]));
          fuel_saved.push(Number(values[4]));
        }
      });

      //sum of total diesel and carbon savings
      const sum_carbon = carbon_saved.reduce((acc, val) => acc + val, 0) / 1000; //dividing by thousand for the tons
      const sum_fuel = fuel_saved.reduce((acc, val) => acc + val, 0);
      const totalSums = {
        totalCarbonSavings: sum_carbon,
        totalFuelSavings: sum_fuel
      }

      //monthly averages of diesel and carbon savings
      monthly_average = {};
      filteredLines.forEach(line => {
        const values = line.split(',');
        if (values.length >= 5) {
          const timestamp = values[2];
          const [year, month, day] = timestamp.split('-');
          const carbon_saved_2 = Number(values[3]);
          const fuel_saved_2 = Number(values[4]);

          if (!isNaN(carbon_saved_2) && !isNaN(fuel_saved_2)){
            if (!monthly_average[month]) {
              monthly_average[month] = {
                sumCarbon: 0,
                sumFuel: 0,
                countCarbon: 0,
                countFuel: 0
              };
            }
            monthly_average[month].sumCarbon += carbon_saved_2;
            monthly_average[month].sumFuel += fuel_saved_2;
            monthly_average[month].countCarbon++;
            monthly_average[month].countFuel++;

          }
        }
      });

      for (const month in monthly_average){
        if (monthly_average[month].countCarbon > 0){
          monthly_average[month].averageCarbon = monthly_average[month].sumCarbon / monthly_average[month].countCarbon;
        } else {
          monthly_average[month].averageCarbon = 0;
        }
        if (monthly_average[month].countFuel > 0){
          monthly_average[month].averageFuel = monthly_average[month].sumFuel / monthly_average[month].countFuel;
        } else {
          monthly_average[month].averageFuel = 0;
        }
        
        delete monthly_average[month].sumCarbon;
        delete monthly_average[month].sumFuel;
        delete monthly_average[month].countCarbon;
        delete monthly_average[month].countFuel;
      }
    
    const cumulativeAverages = Object.values(monthly_average).reduce((acc, entry) => {
        acc.averageCarbon += entry.averageCarbon;
        acc.averageFuel += entry.averageFuel;
        return acc
    }, {averageCarbon: 0, averageFuel: 0})

    const totalEntries = Object.keys(monthly_average).length;
    cumulativeAverages.averageCarbon /= totalEntries;
    cumulativeAverages.averageFuel /= totalEntries;

    //now preparing and sending graph data
    const [startYear, startMonth, startDay] = startDate.split('-');
    const [endYear, endMonth, endDay]  = endDate.split('-');
    
    const startDateTime = new Date(startYear, startMonth - 1, startDay);
    const endDateTime = new Date(endYear, endMonth - 1, endDay, 23, 59, 59, 999);

    const filteredArray = filteredLines.filter(element => {
      const [_, secondTimestamp] = element.split(',"');
      const date = new Date(secondTimestamp.slice(0, -1));
      return date >= startDateTime && date <= endDateTime;
    })
    
    //keeping only timestamp and savings data
    const graphResult = filteredArray.map(element => {
      const[,,date1,num1,num2] = element.split(',');
      return [date1,parseFloat(num1),parseFloat(num2)]
    })
    const [sumCarbon , sumFuel] = graphResult.reduce(
      ([accCarbon, accFuel], [, carbon, fuel]) => [accCarbon + carbon,  accFuel + fuel],
      [0,0]
    );

    //getting the average carbon and fuel saved for the time intervals
    const timeAverageCarbon = sumCarbon / graphResult.length;
    const timeAverageFuel = sumFuel / graphResult.length;
    const graphInfo = {
      graphNumericals: graphResult,
      timeIntervalCarbonAverage: timeAverageCarbon,
      timeIntervalFuelAverage: timeAverageFuel,
    }
    
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ totalSums, cumulativeAverages, graphInfo }));
    });
  } else {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing required parameters: id, startDate, endDate');
  }
});

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}/`);
});