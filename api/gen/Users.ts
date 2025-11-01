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

import { CreateUserDto } from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Users<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags Users
   * @name UserControllerCreateUser
   * @summary Create user and account after Auth0 signup
   * @request POST:/users/create
   */
  userControllerCreateUser = (
    data: CreateUserDto,
    params: RequestParams = {},
  ) =>
    this.http.request<void, void>({
      path: `/users/create`,
      method: "POST",
      body: data,
      type: ContentType.Json,
      ...params,
    });
  /**
   * No description
   *
   * @tags Users
   * @name UserControllerGetCurrentUser
   * @summary Get current user information
   * @request GET:/users/self
   * @secure
   */
  userControllerGetCurrentUser = (params: RequestParams = {}) =>
    this.http.request<void, any>({
      path: `/users/self`,
      method: "GET",
      secure: true,
      ...params,
    });
}
