export type ComputedAnalytics = {
  averageViews: number;
  averageEngagementPercentage: number;
  medianViews: number;
  medianEngagementPercentage: number;
  averageViewRate: number | null;
  averageViews60d: number | null;
  medianViews60d: number | null;
  averageEngagementPercentage60d: number | null;
  medianEngagementPercentage60d: number | null;
  averageViewRate60d: number | null;
  lastPostDate: string | null;
  postsPerMonth: number;
};
