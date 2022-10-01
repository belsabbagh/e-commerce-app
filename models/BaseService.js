const { InternalServerError, NotFoundError, InvalidDuplicateEntryError } = require('../errors');
const { constants: { STATUS_CODES, PAGINATION_DEFAULT_VALUES } } = require('../config')

module.exports = class BaseService {
    constructor(model) {
        this.model = model
    }

    /**
     * @throws {InternalServerError}
     * @param {Object} object
     * @returns {Promise<*>}
     */
    async add(object) {
        try {
            return await this.model.create(object);
        } catch (err) {
            if (err.code === STATUS_CODES.MongoDuplicateKeyError) {
                const duplicateMessage = `${Object.keys(err.keyPattern)} already exists`
                throw new InvalidDuplicateEntryError(duplicateMessage)
            }
            const objectName = this.model.collection.collectionName
            throw new InternalServerError(`Failed to run query to create ${objectName}`)
        }
    }

    /**
     * @throws {NotFoundError}
     * @param {Object} filter
     * @returns {Promise<*>}
     */
    async get(filter = {}, fields = null, paging = PAGINATION_DEFAULT_VALUES) {
        const page = parseInt(paging.page, 10)
        const limit = parseInt(paging.limit, 10)

        const startIndex = (page - 1) * limit
        const endIndex = page * limit

        const response = {}

        if (endIndex < await this.model.countDocuments().exec()) {
            response.next = {
                page: page + 1,
                limit
            }
        }

        if (startIndex > 0) {
            response.previous = {
                page: page - 1,
                limit
            }
        }
        let object = await this.model.find(filter, fields).limit(limit).skip(startIndex)
        if (object.length === 0) {
            const objectName = this.model.collection.collectionName
            throw new NotFoundError(`No ${objectName} was found having ${JSON.stringify(filter)}`, filter)
        }
        return {
            ...response,
            results: object
        }
    }

    /**
     * @throws {NotFoundError}
     * @param {String} id
     * @returns {Promise<*>}
     */
    async getById(id) {
        let object = await this.model.findById(id)
        if (!object) throw new NotFoundError(`Nothing was found with id '${id}'.`, { id })
        return object
    }

    /**
     * @throws {NotFoundError}
     * @param {String} id
     * @param {Object} updates
     * @returns {Promise<*>}
     */
    async update(id, updates) {
        await this.getById(id);
        return this.model.findByIdAndUpdate(id, updates, { new: true })
    }

    /**
     * @throws {NotFoundError}
     * @param id
     * @returns {Promise<*>}
     */
    async delete(id) {
        await this.getById(id);
        return this.model.findByIdAndDelete(id)
    }
}
