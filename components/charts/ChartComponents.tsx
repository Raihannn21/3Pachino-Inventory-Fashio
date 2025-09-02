"use client";

import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  ComposedChart,
  Legend,
  Area,
  AreaChart
} from 'recharts';

interface LineChartProps {
  data: any[];
  dataKey: string;
  xAxisKey: string;
  title?: string;
  color?: string;
}

export function SimpleLineChart({ data, dataKey, xAxisKey, title, color = "#2563eb" }: LineChartProps) {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0" 
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis 
            dataKey={xAxisKey}
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: '#64748b',
              fontWeight: 500
            }}
            tickFormatter={(value) => {
              if (xAxisKey === 'date') {
                return new Date(value).toLocaleDateString('id-ID', { 
                  month: 'short', 
                  day: 'numeric' 
                });
              }
              return value;
            }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: '#64748b',
              fontWeight: 500
            }}
            tickFormatter={(value) => {
              if (typeof value === 'number' && value >= 1000) {
                return `Rp${(value / 1000).toFixed(0)}K`;
              }
              return `Rp${value}`;
            }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '12px',
              fontSize: '14px'
            }}
            formatter={(value, name) => [
              typeof value === 'number' ? 
                `Rp ${value.toLocaleString('id-ID')}` : 
                value,
              'Penjualan'
            ]}
            labelFormatter={(label) => {
              if (xAxisKey === 'date') {
                return new Date(label).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
              }
              return label;
            }}
          />
          <Line 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            strokeWidth={3}
            dot={{ 
              fill: color, 
              strokeWidth: 2, 
              r: 4,
              fillOpacity: 1
            }}
            activeDot={{ 
              r: 6, 
              fill: color,
              strokeWidth: 2,
              stroke: 'white',
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface BarChartProps {
  data: any[];
  dataKey: string;
  xAxisKey: string;
  title?: string;
  color?: string;
}

export function SimpleBarChart({ data, dataKey, xAxisKey, title, color = "#3b82f6" }: BarChartProps) {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.9}/>
              <stop offset="95%" stopColor={color} stopOpacity={0.6}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0" 
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis 
            dataKey={xAxisKey}
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: '#64748b',
              fontWeight: 500
            }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: '#64748b',
              fontWeight: 500
            }}
            tickFormatter={(value) => {
              if (typeof value === 'number' && value >= 1000) {
                return `Rp${(value / 1000).toFixed(0)}K`;
              }
              return `Rp${value}`;
            }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '12px',
              fontSize: '14px'
            }}
            formatter={(value, name) => [
              typeof value === 'number' ? 
                `Rp ${value.toLocaleString('id-ID')}` : 
                value,
              'Revenue'
            ]}
          />
          <Bar 
            dataKey={dataKey} 
            fill="url(#barGradient)"
            radius={[4, 4, 0, 0]}
            stroke={color}
            strokeWidth={1}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PieChartProps {
  data: any[];
  dataKey: string;
  nameKey: string;
  title?: string;
  colors?: string[];
}

export function SimplePieChart({ 
  data, 
  dataKey, 
  nameKey, 
  title, 
  colors = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']
}: PieChartProps) {
  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey={dataKey}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value, name) => [
              typeof value === 'number' ? value.toLocaleString('id-ID') : value,
              name
            ]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Enhanced ComposedChart Component for HD quality charts like in the image
interface ComposedChartProps {
  data: any[];
  barDataKey: string;
  lineDataKey: string;
  line2DataKey?: string;
  profitDataKey?: string;
  xAxisKey: string;
  title?: string;
  barColor?: string;
  lineColor?: string;
  line2Color?: string;
  profitColor?: string;
  height?: number;
}

export function SimpleComposedChart({ 
  data, 
  barDataKey, 
  lineDataKey,
  line2DataKey,
  profitDataKey,
  xAxisKey, 
  title, 
  barColor = "#2563eb",
  lineColor = "#7c3aed",
  line2Color = "#f59e0b",
  profitColor = "#10b981",
  height = 450
}: ComposedChartProps) {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <defs>
            <linearGradient id="barGradientComposed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={barColor} stopOpacity={0.9}/>
              <stop offset="95%" stopColor={barColor} stopOpacity={0.7}/>
            </linearGradient>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={profitColor} stopOpacity={0.9}/>
              <stop offset="95%" stopColor={profitColor} stopOpacity={0.7}/>
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#e2e8f0" 
            strokeOpacity={0.5}
            vertical={false}
          />
          <XAxis 
            dataKey={xAxisKey}
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: '#64748b',
              fontWeight: 500
            }}
            tickFormatter={(value) => {
              if (xAxisKey === 'date') {
                return new Date(value).toLocaleDateString('id-ID', { 
                  day: 'numeric',
                  month: 'short'
                });
              }
              return value;
            }}
          />
          <YAxis 
            yAxisId="left"
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: '#64748b',
              fontWeight: 500
            }}
            tickFormatter={(value) => {
              if (typeof value === 'number' && value >= 1000) {
                return `Rp${(value / 1000).toFixed(0)}K`;
              }
              return `Rp${value}`;
            }}
          />
          <YAxis 
            yAxisId="right"
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ 
              fontSize: 12, 
              fill: '#64748b',
              fontWeight: 500
            }}
            tickFormatter={(value) => {
              if (typeof value === 'number' && value >= 1000) {
                return `Rp${(value / 1000).toFixed(0)}K`;
              }
              return `Rp${value}`;
            }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'white',
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              padding: '16px',
              fontSize: '14px'
            }}
            formatter={(value, name) => {
              const labels = {
                [barDataKey]: 'Penjualan',
                [lineDataKey]: 'Pembelian', 
                [line2DataKey || '']: 'Pengeluaran',
                [profitDataKey || '']: 'Profit'
              };
              return [
                typeof value === 'number' ? 
                  `Rp ${value.toLocaleString('id-ID')}` : 
                  value,
                labels[name as string] || name
              ];
            }}
            labelFormatter={(label) => {
              if (xAxisKey === 'date') {
                return new Date(label).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                });
              }
              return label;
            }}
          />
          <Legend 
            wrapperStyle={{
              paddingTop: '20px',
              fontSize: '14px',
              fontWeight: '500'
            }}
            formatter={(value) => {
              const labels = {
                [barDataKey]: 'Penjualan',
                [lineDataKey]: 'Pembelian',
                [line2DataKey || '']: 'Pengeluaran',
                [profitDataKey || '']: 'Profit'
              };
              return labels[value] || value;
            }}
          />
          <Bar 
            yAxisId="left"
            dataKey={barDataKey} 
            fill="url(#barGradientComposed)"
            radius={[2, 2, 0, 0]}
            stroke={barColor}
            strokeWidth={1}
          />
          {profitDataKey && (
            <Bar 
              yAxisId="left"
              dataKey={profitDataKey} 
              fill="url(#profitGradient)"
              radius={[2, 2, 0, 0]}
              stroke={profitColor}
              strokeWidth={1}
            />
          )}
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey={lineDataKey} 
            stroke={lineColor} 
            strokeWidth={3}
            dot={{ 
              fill: lineColor, 
              strokeWidth: 2, 
              r: 3,
              fillOpacity: 1
            }}
            activeDot={{ 
              r: 5, 
              fill: lineColor,
              strokeWidth: 2,
              stroke: 'white'
            }}
          />
          {line2DataKey && (
            <Line 
              yAxisId="right"
              type="monotone" 
              dataKey={line2DataKey} 
              stroke={line2Color} 
              strokeWidth={3}
              dot={{ 
                fill: line2Color, 
                strokeWidth: 2, 
                r: 3,
                fillOpacity: 1
              }}
              activeDot={{ 
                r: 5, 
                fill: line2Color,
                strokeWidth: 2,
                stroke: 'white'
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
