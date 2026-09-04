import * as Sentry from '@sentry/nextjs'
import { SENTRY_ORTAK } from '@/lib/izleme/sentryOrtak'

Sentry.init(SENTRY_ORTAK)
