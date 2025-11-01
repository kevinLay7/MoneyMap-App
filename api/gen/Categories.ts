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

import { Category } from "./data-contracts";
import { HttpClient, RequestParams } from "./http-client";

export class Categories<SecurityDataType = unknown> {
  http: HttpClient<SecurityDataType>;

  constructor(http: HttpClient<SecurityDataType>) {
    this.http = http;
  }

  /**
   * No description
   *
   * @tags Categories
   * @name CategoriesControllerFindAll
   * @summary Get all categories
   * @request GET:/categories
   */
  categoriesControllerFindAll = (params: RequestParams = {}) =>
    this.http.request<Category[], any>({
      path: `/categories`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Categories
   * @name CategoriesControllerCreate
   * @summary Create a new category
   * @request POST:/categories
   */
  categoriesControllerCreate = (params: RequestParams = {}) =>
    this.http.request<Category, void>({
      path: `/categories`,
      method: "POST",
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Categories
   * @name CategoriesControllerFindById
   * @summary Get category by id
   * @request GET:/categories/{id}
   */
  categoriesControllerFindById = (id: string, params: RequestParams = {}) =>
    this.http.request<Category, void>({
      path: `/categories/${id}`,
      method: "GET",
      format: "json",
      ...params,
    });
  /**
   * No description
   *
   * @tags Categories
   * @name CategoriesControllerUpdate
   * @summary Update a category
   * @request PUT:/categories/{id}
   */
  categoriesControllerUpdate = (id: string, params: RequestParams = {}) =>
    this.http.request<Category, void>({
      path: `/categories/${id}`,
      method: "PUT",
      format: "json",
      ...params,
    });
}
