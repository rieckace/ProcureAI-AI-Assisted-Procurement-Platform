import { Box, Skeleton, Card, CardContent, Grid } from '@mui/material';

const SHIMMER_SX = {
  '&::after': {
    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
    animation: 'shimmer 1.8s ease-in-out infinite',
  },
};

export function TableSkeleton({ rows = 5, columns = 6 }) {
  return (
    <Box sx={{ p: 2 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton
              key={j}
              variant="text"
              width={j === 0 ? '25%' : '15%'}
              height={20}
              sx={{ borderRadius: 1, ...SHIMMER_SX }}
            />
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function CardSkeleton() {
  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={28} sx={{ mb: 1, ...SHIMMER_SX }} />
            <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2, ...SHIMMER_SX }} />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 1, ...SHIMMER_SX }} />
              <Skeleton variant="rectangular" width={60} height={24} sx={{ borderRadius: 1, ...SHIMMER_SX }} />
            </Box>
          </Box>
          <Box>
            <Skeleton variant="circular" width={40} height={40} sx={{ ...SHIMMER_SX }} />
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export function StatsSkeleton() {
  return (
    <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} sx={{ flex: 1, minWidth: 140 }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Skeleton variant="text" width="50%" height={36} sx={{ mb: 0.5, ...SHIMMER_SX }} />
            <Skeleton variant="text" width="70%" height={16} sx={{ ...SHIMMER_SX }} />
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export function DashboardSkeleton() {
  return (
    <Box>
      <Skeleton variant="text" width="35%" height={32} sx={{ mb: 0.5, ...SHIMMER_SX }} />
      <Skeleton variant="text" width="55%" height={20} sx={{ mb: 3, ...SHIMMER_SX }} />
      <StatsSkeleton />
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Skeleton variant="text" width="50%" height={20} sx={{ mb: 2, ...SHIMMER_SX }} />
              <Skeleton variant="circular" width={180} height={180} sx={{ mx: 'auto', ...SHIMMER_SX }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Skeleton variant="text" width="40%" height={20} sx={{ mb: 2, ...SHIMMER_SX }} />
              <Skeleton variant="rectangular" width="100%" height={220} sx={{ borderRadius: 2, ...SHIMMER_SX }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      <TableSkeleton rows={5} columns={7} />
    </Box>
  );
}
