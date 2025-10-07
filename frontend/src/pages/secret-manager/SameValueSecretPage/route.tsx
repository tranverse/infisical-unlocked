import {
  createFileRoute,
  linkOptions,
  stripSearchParams,
} from '@tanstack/react-router'
import { SameValueSecretPage } from './SameValueSecretPage'

export const Route = createFileRoute(
  '/_authenticate/_inject-org-details/_org-layout/projects/secret-management/$projectId/_secret-manager-layout/reference-secrets/secret-value',
)({
  component: SameValueSecretPage,
})
