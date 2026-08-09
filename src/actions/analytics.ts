'use server';

import type { ActionResult } from '../server/action-result';
import { AuthorizationError } from '../server/auth/ownership';
import { requireUser } from '../server/auth/require-user';
import { AuthenticationError } from '../server/auth/session';
import { getAnalyticsOverviewData } from '../server/queries/analytics';
import type { AnalyticsOverviewDTO } from '../types/analytics';

export async function getAnalyticsOverview(): Promise<ActionResult<AnalyticsOverviewDTO>> {
  try {
    const authenticatedUser = await requireUser();
    const data = await getAnalyticsOverviewData(authenticatedUser.id);
    return { ok: true, data };
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return { ok: false, code: error.code, message: error.message };
    }
    return {
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Unable to load analytics. Please try again.',
    };
  }
}
