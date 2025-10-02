/* eslint-disable no-param-reassign */
import { useCallback, useMemo } from "react";
import { useQueries, useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";

import { createNotification } from "@app/components/notifications";
import { apiRequest } from "@app/config/request";
import { useToggle } from "@app/hooks/useToggle";
import { HIDDEN_SECRET_VALUE } from "@app/pages/secret-manager/SecretDashboardPage/components/SecretListView/SecretItem";

import { ERROR_NOT_ALLOWED_READ_SECRETS } from "./constants";


