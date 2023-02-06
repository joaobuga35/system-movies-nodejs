import { request, Request, Response } from "express";
import { QueryConfig } from "pg";
import format from "pg-format";
import { client } from "./database";
import { allMoviesResult, iMovies, moviesCreate, moviesResult } from "./interfaces";

export const createMovies = async (request: Request, response: Response): Promise<Response> => {
    try {
        const movieCreateRequest: moviesCreate = request.body

        if (movieCreateRequest.description === "") {
            movieCreateRequest.description = null
        }
    
        const queryString : string = `
                INSERT INTO 
                movies_favorites("name", description, duration, price)
                VALUES ($1, $2, $3, $4)
                RETURNING *;
            `
                
        const queryConfig: QueryConfig = {
            text: queryString,
            values: Object.values(movieCreateRequest)
        }
                
        const queryResult:moviesResult = await client.query(queryConfig);
        const newMovie: iMovies = queryResult.rows[0]

        
        return response.status(201).json(newMovie)
        
    } catch (error) {
        return response.status(409).json({message: 'Movie already exists.'})
    }
}

export const listAllMovies = async (request: Request, response: Response): Promise<Response> => {
    if (!request.query.page && !request.query.perPage) {
        
        const query: string = `
            SELECT 
                *
            FROM 
                movies_favorites
        `
        const queryResult:moviesResult = await client.query(query)
        return response.status(200).json(queryResult.rows)
    }

    let page : number = Number(request.query.page) || 1
    let perPage : number = Number(request.query.perPage) || 5

    if (0 > page) {
        page = 1
    }

    if (0 > perPage || perPage > 5) {
        perPage = 5
    }

    let baseUrl: string = 'http://localhost:3000/movies'
    let prevPage:string | null = page === 1 ? null : `${baseUrl}?page=${page - 1}&perPage=${perPage}`
    let nextPage: string | null = `${baseUrl}?page=${page + 1}&perPage=${perPage}`


    if (request.query.sort && !request.query.order) {
            const query: string = format(`
                SELECT 
                    *
                FROM
                    movies_favorites
                ORDER BY
                    %I ASC
                LIMIT %L OFFSET %L;
        `,`${request.query.sort}`,`${perPage}`,`${perPage * (page - 1)}`)

        const queryResult:moviesResult = await client.query(query)

        if (queryResult.rowCount < 5) {
            nextPage = null
        }

        const listMoviesResult: allMoviesResult = {
            previousPage: prevPage,
            nextPage: nextPage,
            count: queryResult.rowCount,
            data:[...queryResult.rows]
        }
        return response.status(200).json(listMoviesResult)

    }
    
    let sort =  typeof request.query.sort === "string" ? request.query.sort.toLowerCase() : undefined
    let order: string = request.query.order === "DESC" || request.query.order === "desc" ? request.query.order.toUpperCase() : "ASC" 

    if (sort !== "price" && sort !== "duration") {
        const query: string = format(`
            SELECT 
                *
            FROM
                movies_favorites
            LIMIT %L OFFSET %L;
        `,`${perPage}`,`${perPage * (page - 1)}`)

        const queryResult:moviesResult = await client.query(query)

        if (queryResult.rowCount < 5) {
            nextPage = null
        }

        const listMoviesResult: allMoviesResult = {
            previousPage: prevPage,
            nextPage: nextPage,
            count: queryResult.rowCount,
            data:[...queryResult.rows]
        }

        return response.status(200).json(listMoviesResult)
    }
    
    if (!request.query.sort && !request.query.order || !request.query.sort && request.query.order || !sort) {
        const query: string = format(`
            SELECT 
                *
            FROM
                movies_favorites
            LIMIT %L OFFSET %L;
        `,`${perPage}`,`${perPage * (page - 1)}`)

        const queryResult:moviesResult = await client.query(query)

        if (queryResult.rowCount < 5) {
            nextPage = null
        }

        const listMoviesResult: allMoviesResult = {
            previousPage: prevPage,
            nextPage: nextPage,
            count: queryResult.rowCount,
            data:[...queryResult.rows]
        }

        return response.status(200).json(listMoviesResult)
    }

    const query: string = format(`
        SELECT 
            *
        FROM
            movies_favorites
        ORDER BY
            %I %s
        LIMIT %L OFFSET %L;
    `,`${sort}`,`${order}`,`${perPage}`,`${perPage * (page - 1)}`)

    const queryResult:moviesResult = await client.query(query)

    if (queryResult.rowCount < 5) {
        nextPage = null
    }

    const listMoviesResult: allMoviesResult = {
        previousPage: prevPage,
        nextPage: nextPage,
        count: queryResult.rowCount,
        data:[...queryResult.rows]
    }
    return response.status(200).json(listMoviesResult)
}

export const editMovie =  async (request:Request, response: Response): Promise<Response> => {
    const id: number = parseInt(request.params.id)
    const movieKeys: Array<string> = Object.keys(request.body)
    const movieValues: any = Object.values(request.body)

    const query: string = `
        UPDATE
            movies_favorites
        SET(%I) = ROW(%L)
        WHERE
            id = $1
        RETURNING *;
    `

    const queryFormat: string = format(query,movieKeys,movieValues)

    const queryConfig: QueryConfig = {
        text: queryFormat,
        values:[id]
    }

    const queryResult: moviesResult = await client.query(queryConfig)
    return response.status(200).json(queryResult.rows[0])
}

export const deleteMovie =  async (request:Request, response: Response): Promise<Response> => {
    const id: number = parseInt(request.params.id)

    const query: string = `
        DELETE FROM movies_favorites WHERE id = $1
    `

    const queryConfig: QueryConfig = {
        text: query,
        values: [id]
    }

    await client.query(queryConfig)
    return response.status(204).json()
}