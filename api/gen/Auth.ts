/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

import { HttpClient, RequestParams } from "./http-client";

export class Auth<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags Auth
   * @name AuthControllerLogin
   * @request GET:/auth/login
   */
  authControllerLogin = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/auth/login`,
      method: "GET",
      ...params,
    });
  /**
   * No description
   *
   * @tags Auth
   * @name AuthControllerCallback
   * @request GET:/auth/callback
   */
  authControllerCallback = (
    query: {
      code: string;
      error: string;
      error_description: string;
    },
    params: RequestParams = {},
  ) =>
    this.http.request<void, any>({
      path: `/auth/callback`,
      method: "GET",
      query: query,
      ...params,
    });
  /**
   * No description
   *
   * @tags Auth
   * @name AuthControllerLogout
   * @request GET:/auth/logout
   */
  authControllerLogout = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/auth/logout`,
      method: "GET",
      ...params,
    });
}
