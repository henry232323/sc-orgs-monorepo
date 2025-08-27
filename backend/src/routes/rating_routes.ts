import express, { Router } from 'express';
import { RatingController } from '../controllers/rating_controller';
import { requireLogin } from '../middleware/auth';

const router: Router = express.Router();
const ratingController = new RatingController();

// Rate an organization (create or update)
router.post(
  '/organizations/:organizationId/rate',
  requireLogin as any,
  ratingController.rateOrganization.bind(ratingController)
);

// Get all ratings for an organization
router.get(
  '/organizations/:organizationId/ratings',
  ratingController.getOrganizationRatings.bind(ratingController)
);

// Get rating statistics for an organization
router.get(
  '/organizations/:organizationId/ratings/stats',
  ratingController.getRatingStats.bind(ratingController)
);

// Get user's rating for an organization
router.get(
  '/organizations/:organizationId/ratings/user',
  requireLogin as any,
  ratingController.getUserRating.bind(ratingController)
);

// Get all ratings by a user
router.get(
  '/ratings/user',
  requireLogin as any,
  ratingController.getUserRatings.bind(ratingController)
);

// Delete a rating
router.delete(
  '/ratings/:ratingId',
  requireLogin as any,
  ratingController.deleteRating.bind(ratingController)
);

export default router;
