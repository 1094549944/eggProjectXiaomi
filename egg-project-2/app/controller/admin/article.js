
const fs = require('fs');

const pump = require('mz-modules/pump');

const BaseController = require('./base.js');
class ArticleController extends BaseController {
  async index() {


    const page = this.ctx.request.query.page || 1;

    const pageSize = 3;


    // 总数量
    const totalNum = await this.ctx.model.Article.find({}).countDocuments();


    /*

         var goodsResult=await this.ctx.model.Goods.find({}).skip((page-1)*pageSize).limit(pageSize);

      */


    // 让文章和分类进行关联

    const result = await this.ctx.model.Article.aggregate([

      {
        $lookup: {
          from: 'article_cate',
          localField: 'cate_id',
          foreignField: '_id',
          as: 'catelist',
        },
      },
      {
        $skip: (page - 1) * pageSize,
      },
      {
        $limit: pageSize,
      },

    ]);

    console.log(result);


    await this.ctx.render('admin/article/index', {
      list: result,
      totalPages: Math.ceil(totalNum / pageSize),
      page,
    });

  }
  async add() {

    // 获取所有的分类
    const cateResult = await this.ctx.model.ArticleCate.aggregate([

      {
        $lookup: {
          from: 'article_cate',
          localField: '_id',
          foreignField: 'pid',
          as: 'items',
        },
      },
      {
        $match: {
          pid: '0',
        },
      },

    ]);


    await this.ctx.render('admin/article/add', {

      cateList: cateResult,
    });

  }

  async doAdd() {

    const parts = this.ctx.multipart({ autoFields: true });
    let files = {};
    let stream;
    while ((stream = await parts()) != null) {
      if (!stream.filename) {
        break;
      }
      const fieldname = stream.fieldname; // file表单的名字

      // 上传图片的目录
      const dir = await this.service.tools.getUploadFile(stream.filename);
      const target = dir.uploadDir;
      const writeStream = fs.createWriteStream(target);

      await pump(stream, writeStream);

      files = Object.assign(files, {
        [fieldname]: dir.saveDir,
      });

      // 生成缩略图
      this.service.tools.jimpImg(target);


    }

    const article = new this.ctx.model.Article(Object.assign(files, parts.field));
    await article.save();

    await this.success('/admin/article', '增加文章成功');

  }


  async edit() {

    const id = this.ctx.request.query.id;

    // 当前id对应的数据
    const result = await this.ctx.model.Article.find({ _id: id });

    // 获取所有的分类
    const cateResult = await this.ctx.model.ArticleCate.aggregate([

      {
        $lookup: {
          from: 'article_cate',
          localField: '_id',
          foreignField: 'pid',
          as: 'items',
        },
      },
      {
        $match: {
          pid: '0',
        },
      },

    ]);

    await this.ctx.render('admin/article/edit', {
      cateList: cateResult,
      list: result[0],
      prevPage: this.ctx.state.prevPage,
    });

  }

  async doEdit() {

    const parts = this.ctx.multipart({ autoFields: true });
    let files = {};
    let stream;
    while ((stream = await parts()) != null) {
      if (!stream.filename) {
        break;
      }
      const fieldname = stream.fieldname; // file表单的名字

      // 上传图片的目录
      const dir = await this.service.tools.getUploadFile(stream.filename);
      const target = dir.uploadDir;
      const writeStream = fs.createWriteStream(target);

      await pump(stream, writeStream);

      files = Object.assign(files, {
        [fieldname]: dir.saveDir,
      });


      // 生成缩略图
      this.service.tools.jimpImg(target);

    }


    const id = parts.field.id;

    const prevPage = parts.field.prevPage;

    const updateResult = Object.assign(files, parts.field);

    await this.ctx.model.Article.updateOne({ _id: id }, updateResult);

    await this.success(prevPage, '修改数据成功');


  }


}
module.exports = ArticleController;
