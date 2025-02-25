class ApiResponse{
    constructor(statusCode, data, mesasge = "Success"){
        this.statusCode = statusCode
        this.data = data
        this.mesasge = mesasge
        this.success = statusCode < 400
    }
}

export{ApiResponse}