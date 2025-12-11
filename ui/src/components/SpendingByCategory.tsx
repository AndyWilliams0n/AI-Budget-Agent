// Spending by category chart component
import { Card, CardContent, Typography, Box } from '@mui/material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SpendingByCategoryProps {
  data: { name: string; value: number }[];
  title?: string;
}

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#a855f7', '#06b6d4'];

export const SpendingByCategory = ({ data, title = 'Spending by Category' }: SpendingByCategoryProps) => {
  return (
    <Card sx={cardSx}>
      <CardContent sx={cardContentSx}>
        <Typography variant="h6" sx={titleSx}>
          {title}
        </Typography>

        <Box sx={chartContainerSx}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>

              <Tooltip
                contentStyle={tooltipContentStyle}
                itemStyle={tooltipItemStyle}
                labelStyle={tooltipLabelStyle}
                formatter={(value: number) => [`£${value.toFixed(2)}`, 'Amount']}
              />

              <Legend
                wrapperStyle={legendWrapperStyle}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

// Style constants
const cardSx = {
  backgroundColor: '#1a1f37',
  color: '#fff',
  height: '100%',
  borderRadius: 2,
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const cardContentSx = {
  p: 3,
};

const titleSx = {
  mb: 3,
  fontWeight: 600,
};

const chartContainerSx = {
  width: '100%',
  height: 300,
};

const tooltipContentStyle = {
  backgroundColor: '#0f1729',
  border: '1px solid #2d3348',
  borderRadius: '8px',
  color: '#fff',
};

const legendWrapperStyle = {
  color: '#94a3b8',
  fontSize: '12px',
};

const tooltipItemStyle = {
  color: '#fff',
};

const tooltipLabelStyle = {
  color: '#fff',
};


