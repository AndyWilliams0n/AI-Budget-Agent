// KPI Card component for dashboard metrics
import { Card, CardContent, Box, Typography } from '@mui/material';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  backgroundColor?: string;
}

export const KPICard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = '#6366f1',
  trend,
  backgroundColor = '#1a1f37',
}: KPICardProps) => {
  return (
    <Card
      sx={getCardSx(backgroundColor)}
    >
      <CardContent sx={cardContentSx}>
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Typography variant="body2" sx={titleTextSx}>
            {title}
          </Typography>

          <Box sx={iconContainerSx}>
            <Icon size={20} color={iconColor} />
          </Box>
        </Box>

        <Typography variant="h3" sx={valueSx}>
          {value}
        </Typography>

        {subtitle && (
          <Typography variant="body2" sx={subtitleSx}>
            {subtitle}
          </Typography>
        )}

        {trend && (
          <Box display="flex" alignItems="center" gap={0.5} mt={1}>
            <Typography
              variant="caption"
              sx={getTrendValueSx(Boolean(trend.positive))}
            >
              {trend.positive ? '+' : ''}{trend.value}%
            </Typography>

            <Typography variant="caption" sx={trendLabelSx}>
              {trend.label}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

// Style constants
const cardSx = {
  color: '#fff',
  height: '100%',
  borderRadius: 2,
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
};

const getCardSx = (backgroundColor: string) => ({
  ...cardSx,
  backgroundColor,
});

const cardContentSx = {
  p: 3,
};

const titleTextSx = {
  color: '#94a3b8',
  fontWeight: 500,
};

const iconContainerSx = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: 1,
  p: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const valueSx = {
  fontWeight: 700,
  mb: 1,
};

const subtitleSx = {
  color: '#94a3b8',
};

const trendLabelSx = {
  color: '#94a3b8',
};

const getTrendValueSx = (isPositive: boolean) => ({
  color: isPositive ? '#10b981' : '#ef4444',
  fontWeight: 600,
});


