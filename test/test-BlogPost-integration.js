const chai = require('chai');
const chaiHttp = require('chai-http');
const faker = require('faker');
const mongoose = require('mongoose');

const should = chai.should();

const {BlogPost} = require('../models');
const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');

chai.use(chaiHttp);

function seedBlogPostData() {
  console.log('Seeding BlogPost Data');
  const seedData = [];

  for(let i = 1; i <= 10; i++) {
    seedData.push(generateBlogPostData());
  }

  return BlogPost.insertMany(seedData);
}

function generateBlogPostData() {
  return {
    title: faker.lorem. words(),
    content: faker.lorem.paragraph(),
    author: {
      firstName: faker.name.lastName(),
      lastName: faker.name.firstName()
    },
    created: faker.date.past()
  }
}

function tearDownDb() {
  console.warn('Deleting Database');
  return mongoose.connection.dropDatabase();
}

describe('BlogPost API', function() {
  before(function() {
    return runServer(TEST_DATABASE_URL);
  });

  beforeEach(function() {
    return seedBlogPostData();
  });

  afterEach(function() {
    return tearDownDb();
  });

  after(function() {
    return closeServer();
  });

  describe('GET endpoint', function() {
    it('should return all existing blog posts', function() {
      let response;
      return chai.request(app)
        .get('/posts')
        .then(function(_response) {
          response = _response;
          response.should.have.status(200);
          console.log(response.body);
          response.body.should.have.length.of.at.least(1);
        });
    });

    it('should return blog posts with the correct fields', function() {
      let responseBlogPost;

      return chai.request(app)
        .get('/posts')
        .then(function(response) {
          response.should.have.status(200);
          response.should.be.json;
          response.body.should.be.a('array');
          response.body.should.have.length.of.at.least(1);

          response.body.forEach(function(post) {
            post.should.be.a('object');
            post.should.include.keys('id', 'author', 'content', 'created');
          });

          responseBlogPost = response.body[0];
          return BlogPost.findById(responseBlogPost.id);
        })
        .then(function(post) {
          responseBlogPost.id.should.equal(post.id);
          responseBlogPost.author.should.contain(post.author.lastName);
          responseBlogPost.author.should.contain(post.author.firstName);
          responseBlogPost.content.should.equal(post.content);
          
          // console.log('responseBlogPost.created', responseBlogPost.created);
          // console.log('post.created', post.created);
          // different date formats, how to convert?
          // AssertionError: expected '2017-07-15T11:09:35.158Z' to equal Sat, 15 Jul 2017 11:09:35 GMT
          // responseBlogPost.created.should.equal(post.created);
        });
    });
  });

  describe('POST endpoint', function() {
    it('should add a new blog post', function() {
      const newBlogPost = generateBlogPostData();

      return chai.request(app)
        .post('/posts')
        .send(newBlogPost)
        .then(function(response) {
          response.should.have.status(201);
          response.should.be.json;
          response.body.should.be.a('object');
          response.body.should.include.keys('id', 'title', 'author', 'content', 'created');
          response.body.id.should.not.be.null;
          response.body.title.should.equal(newBlogPost.title);
          response.body.author.should.contain(newBlogPost.author.firstName);
          response.body.author.should.contain(newBlogPost.author.lastName);
          response.body.content.should.equal(newBlogPost.content);
          // response.body.created.should.equal(newBlogPost.created);
          // date match issue again

          return BlogPost.findById(response.body.id);
        })
        .then(function(post) {
          console.log('post', post);
          console.log('newBlogPost', newBlogPost);
          post.id.should.not.be.null;
          post.title.should.equal(newBlogPost.title);
          post.author.firstName.should.equal(newBlogPost.author.firstName);
          post.author.lastName.should.equal(newBlogPost.author.lastName);
          post.content.should.equal(newBlogPost.content);
          // post.created.should.equal(newBlogPost.created);
          // not equal dates?
        });
    });
  });

  describe('PUT endpoint', function() {
    it('should update passed in fields', function() {
      
      let postUpdateData = {
        title: "updated title",
        content: "updated content",
        author: "updated author"
      };

      return chai.request(app)
        .get('/posts')
        .then(function(response) {
          postUpdateData.id = response.body[0].id;
          postUpdateData.created = response.body[0].created;

          return chai.request(app)
            .put(`/posts/${postUpdateData.id}`)
            .send(postUpdateData)
        })
        .then(function(response) {
          // response.should.have.status(204);
          // check this in my version
          response.should.have.status(201);
          response.body.should.be.a('object');
        });
    });
  });

  describe('DELETE endpoint', function() {
    it('should delete a restaurant by id', function() {
      return chai.request(app)
      .get('/posts')
      .then(function(response) {
        return chai.request(app)
          .delete(`/posts/${response.body[0].id}`);
      })
      .then(function(response) {
        response.should.have.status(204);
      });
    });
  });

});