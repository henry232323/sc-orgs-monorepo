import { User as CustomUser } from './user';

declare global {
  namespace Express {
    interface Request {
      user?: CustomUser;
      event?: any;
      organization?: any;
      userRole?: string;
      org?: any; // For resolved organization middleware
      hrPermissions?: {
        canManageApplications: boolean;
        canViewApplications: boolean;
        canProcessApplications: boolean;
        canManageOnboarding: boolean;
        canViewOnboarding: boolean;
        canManagePerformance: boolean;
        canConductReviews: boolean;
        canManageSkills: boolean;
        canVerifySkills: boolean;
        canManageDocuments: boolean;
        canViewAnalytics: boolean;
        isHRManager: boolean;
        isRecruiter: boolean;
        isSupervisor: boolean;
      };
      hrDataFilter?: {
        limitToDirectReports: boolean;
        limitPerformanceData: boolean;
        fullAccess: boolean;
      };
    }
  }
}
