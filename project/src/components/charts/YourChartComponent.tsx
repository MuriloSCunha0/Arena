import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const YourChartComponent = ({ data }: { data: Array<{ [key: string]: any }> }) => {
  return (
    <BarChart width={600} height={300} data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Legend />
      <Bar dataKey="value" yAxisId="left" fill="#8884d8" />
      {/* Ensure the dataKey matches a valid field in your data */}
    </BarChart>
  );
};

export default YourChartComponent;
