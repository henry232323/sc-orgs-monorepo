import { User as CustomUser } from './user';

declare global {
  namespace Express {
    interface Request {
      user?: CustomUser;
      event?: any;
      organization?: any;
      userRole?: string;
    }
  }
}
