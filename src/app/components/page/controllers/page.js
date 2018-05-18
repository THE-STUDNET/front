angular.module('page').controller('page_controller',
    ['$scope','session', 'page', 'conversation', 'pages_posts', 'library_service','$q','api_service',
        'user_model', 'page_model',  'page_modal_service',  'pages', 'page_users', '$translate',
        'user_events', 'user_groups', 'user_courses', 'user_organizations', 'pages_constants',
        'notifier_service', 'page_library',  'modal_service',
        '$state',  'parents', 'children', 'events_service', 'cvn_model', 'pages_config',
        'state_service', 'social_service', 'docslider_service', 'followers',
        function($scope, session, page, conversation, pages_posts, library_service, $q, api_service,
            user_model, page_model,  page_modal_service, pages, page_users, $translate,
            user_events, user_groups, user_courses, user_organizations, pages_constants,
            notifier_service, page_library, modal_service, $state,
            parents, children, events_service,   cvn_model,  pages_config,
            state_service,  social_service, docslider_service, followers){

            var ctrl = this;
            ctrl.$state = $state;
            ctrl.label = pages_config[page.datum.type].label;
            document.title = 'TWIC - ' + page.datum.title;
            ctrl.page = page;
            state_service.parent_state = (pages_config[page.datum.type].parent_state || 'lms.community');
            ctrl.defaultBackgrounds = {
                event : "assets/img/defaulteventbackground.png",
                group : "assets/img/defaultgroupbackground.png"
            };
           
            ctrl.config = pages_config;
            if(page.datum.type === pages_constants.pageTypes.COURSE || page.datum.type === pages_constants.pageTypes.ORGANIZATION){
                ctrl.confidentiality = { 0 : "", 1 : "" , 2 : "" };
            }
            else{
                ctrl.confidentiality = pages_constants.pageConfidentiality;
            }
            ctrl.hints = {};
            $translate('confidentiality.public_hint',{label:ctrl.label}).then(function( translation ){
                ctrl.hints.public = translation;
            });
            $translate('confidentiality.closed_hint',{label:ctrl.label}).then(function( translation ){
                ctrl.hints.closed = translation;
            });
            $translate('confidentiality.secret_hint',{label:ctrl.label}).then(function( translation ){
                ctrl.hints.secret = translation;
            });
            ctrl.page_fields = pages_config[page.datum.type].fields;
            ctrl.page_users = page_users;
            ctrl.defaultContent = 'app/components/page/tpl/users.html';
            ctrl.users = page_users.pages[page.datum.id];
            ctrl.parents = parents;
            ctrl.children = children;
            ctrl.editable = (ctrl.users.administrators.indexOf(session.id) !== -1 || session.roles[1]);
            ctrl.isStudnetAdmin = session.roles[1];
            ctrl.me = session.id;
            ctrl.user_model = user_model;
            ctrl.page_model = page_model;
            ctrl.conversation = conversation;
            ctrl.isMember = function(id){
                return ctrl.users.administrators.indexOf(id || session.id) !== -1 || ctrl.users.members.indexOf(id || session.id) !== -1;
            };
            ctrl.isInvited = function(id){
                return ctrl.users.invited.indexOf(id || session.id) !== -1;
            };
            ctrl.is_member = ctrl.isMember();
            state_service.parent_state = ctrl.is_member ? (pages_config[page.datum.type].parent_state || 'lms.community') : 'lms.community';
            ctrl.isStudent = page.datum.type === 'course' && ctrl.users.members.indexOf(session.id) !== -1;
            ctrl.isAdmin = ctrl.isStudnetAdmin || ctrl.users.administrators.indexOf(session.id) !== -1;
            
            ctrl.tabs = ctrl.config.getTabs(ctrl.page.datum.type, ctrl.editable);
            if(ctrl.children.length){
               delete ctrl.tabs['users'];
            }
            else{
                delete ctrl.tabs['community'];
            }
            ctrl.page_counts = {
                relationship : function(){
                    return ctrl.parents.length + ctrl.children.length;
                },
                resources : function(){
                    return ctrl.page_library.count || 0;
                },
                submissions : function(){
                    return ctrl.assignments.length || 0;
                },
                content: function(){
                    return ctrl.items_count;
                },
                users : function(){
                    return ctrl.users.all.length;
                },
                community : function(){
                    return followers.count;
                }
            };
            
            
            var type = ctrl.page.datum.type;
            ctrl.breadcrumb =  [
                
                ctrl.is_member &&  type !== pages_constants.pageTypes.ORGANIZATION ? 
                    { 
                        text : "My " + ctrl.label + "s", 
                        href : $state.href('lms.user_' + type + 's') 
                    } : 
                    { 
                        text : "Explore", 
                        href : $state.href('lms.community', 
                            { category : type !== pages_constants.pageTypes.ORGANIZATION ? ctrl.page.datum.type + 's' : 'institutions' }) }, 
                { text : page.datum.title }
            ] ;


            //CUSTOM
            if(ctrl.isStudnetAdmin){
                pages.getCustom(page.datum.id).then(function(custom){
                    ctrl.custom = custom;
                });
            }

            //POSTS
            ctrl.loadingPosts = true;
            ctrl.posts = pages_posts.getPaginator(page.datum.id);
            ctrl.posts.get().then(function(){
                ctrl.loadingPosts = false;
            });
            ctrl.nextPosts = function(){
                if(ctrl.loadingPosts){
                    return;
                }
                ctrl.loadingPosts = true;
                var posts_length = ctrl.posts.list.length;
                return ctrl.posts.next().then(function(){
                    ctrl.loadingPosts = posts_length === ctrl.posts.list.length;
                });
            };

            ctrl.onPostDeleted = function( postId ){
                ctrl.posts.unset( postId );
            };
            ctrl.onPostAdded = function( ){
                ctrl.posts.refresh();
            };
            //RESOURCES
            ctrl.loadingDocuments= true;
            ctrl.library_service = library_service;
            ctrl.page_library = page_library.get(page.datum.id);
            ctrl.page_library.get().then(function(){
               ctrl.loadingDocuments = false;
            });
            ctrl.nextDocuments = function(){
                if(ctrl.loadingDocuments){
                    return;
                }
                ctrl.loadingDocuments= true;
                var documents_length = ctrl.page_library.list.length;
                ctrl.page_library.next().then(function(){
                    ctrl.loadingDocuments = documents_length === ctrl.page_library.list.length;
                });
            };

            ctrl.addDocument = function(file){
                page_library.add(ctrl.page.datum.id, file, ctrl.onUploadError).then(function(){
                    ctrl.document = null;
                });
            };

            ctrl.deleteDocument = function(id){
                return page_library.remove(ctrl.page.datum.id, id);
            };

            ctrl.onUploadError = function(){
                $translate('ntf.err_file_upload').then(function( translation ){
                    notifier_service.add({type:'error',message: translation});
                });
            };
            
            ctrl.openSlider = function( $event, index){
                docslider_service.open({ docs : ctrl.page_library.list }, '', $event.target, index + 1);
            };


            //ADD MATERIAL
            ctrl.openResourceModal = function($event){
                modal_service.open({
                    reference: $event.target,
                    blocked : true,
                    scope : {
                        save : ctrl.addDocument,
                    },
                    template:'app/components/page/tpl/resource_modal.html'
                });
            };

           //EDITION
           ctrl.tmp_confidentiality = null;
           ctrl.editDates = function(){
               ctrl.tmp_start = new Date(page.datum.start_date);
               ctrl.tmp_end = new Date(page.datum.end_date);
               ctrl.editingDates = ctrl.editable;
           };

           ctrl.setEditableAddress = function(){
               ctrl.editMap = ctrl.editable;
               ctrl.tmp_address = angular.merge({},ctrl.page.datum.address );
           };

           ctrl.setEditableTags = function(){
               ctrl.editTags = ctrl.editable;
               ctrl.tmp_tags = ctrl.page.datum.tags.concat();
               ctrl.deletedTag = [];
               ctrl.addedTag = [];
           };

           ctrl.removeTag = function(tag){
               ctrl.tmp_tags.splice( ctrl.tmp_tags.indexOf(tag), 1);
           };

           ctrl.addTag = function( $event ){
               if( $event.keyCode === 13 ){
                   $event.stopPropagation();
                   $event.preventDefault();

                   var tags = (ctrl.input_tag||'').match(new RegExp('[A-Za-z0-9_-]+','g'));
                   ctrl.input_tag = '';
                   if( tags && tags.length ){
                       tags.forEach(function(name){
                           if( ctrl.tmp_tags.every(function(tag){ return tag.name!==name; }) ){
                               ctrl.tmp_tags.push({name:name.toLowerCase()});
                           }
                       });
                   }
               }
           };

           ctrl.updateTags = function(){
               var deferred = $q.defer(),
                   requesting = 1,
                   done = function(){
                       requesting--;
                       if( !requesting ){
                           ctrl.editTags = false;
                           deferred.resolve();
                       }
                   },
                   removed = [], added = [];
               // Build removed tags array
               ctrl.page.datum.tags.forEach(function( tag ){
                   if( ctrl.tmp_tags.every(function(t){ return t.name!==tag.name.toLowerCase(); }) ){
                       removed.push(tag);
                   }
               });
               // Build added tags array
               ctrl.tmp_tags.forEach(function(tag){
                   if( ctrl.page.datum.tags.every(function(t){ return t.name.toLowerCase()!==tag.name; }) ){
                       added.push(tag.name);
                   }
               });

               added.forEach(function(name){
                   requesting++;
                   pages.addTag(ctrl.page.datum.id, name).finally(done);
               });
               removed.forEach(function(tag){
                   requesting++;
                   pages.removeTag(ctrl.page.datum.id, tag).finally(done);
               });

               done();
               return deferred.promise;
           };

           // IF DISPLAY pinned
           if( ctrl.users.pinned.length ){
               user_model.get(ctrl.users.pinned).then(function(){
                   var ids = [];
                   ctrl.users.pinned.forEach(function(uid){
                       ids.push( user_model.list[uid].datum.organization_id );
                   });

                   page_model.get(ids);
               });
           }

           ctrl.openEditInstructors = function(){
               ctrl.editInstructors = ctrl.editable;
               ctrl.tmp_instructors = ctrl.users.pinned.concat();
               ctrl.tmp_instructors_added = [];
               ctrl.tmp_instructors_removed = [];
               ctrl.tmp_instructors_searchs = {};
           };

           ctrl.getAdministrators = function( search, pagination ){
               var deferred = $q.defer();

               if( ctrl.tmp_instructors_searchs[search] ){
                   resolve( ctrl.tmp_instructors_searchs[search].slice( (pagination.p-1)*pagination.n, pagination.p*pagination.n ) );
               }else{
                   page_users.search( ctrl.page.datum.id , search, pages_constants.pageRoles.ADMIN, pages_constants.pageStates.MEMBER )
                        .then(function( result ){
                            if( Object.keys(ctrl.tmp_instructors_searchs).length > 3 ){
                                delete( ctrl.tmp_instructors_searchs[Object.keys(ctrl.tmp_instructors_searchs)[0]] );
                            }

                            ctrl.tmp_instructors.forEach( function(id){
                                var idx = result[ctrl.page.datum.id].indexOf(id);
                                if( idx !== -1 ){
                                    result[ctrl.page.datum.id].splice( idx, 1);
                                }
                            });

                            ctrl.tmp_instructors_searchs[search] = result[ctrl.page.datum.id];

                            resolve( ctrl.tmp_instructors_searchs[search].slice( (pagination.p-1)*pagination.n,pagination.p*pagination.n ) );
                        }, function(){
                            deferred.resolve([]);
                        });
               }

               function resolve( ids ){
                   user_model.get(ids).then(function(){
                       var page_ids = [];
                       ids.forEach(function(uid){
                           page_ids.push( user_model.list[uid].datum.organization_id );
                       });

                       page_model.get(page_ids).then(function(){
                           deferred.resolve(ids);
                       });
                   });
               }

               return deferred.promise;
           };

           ctrl.removeFromInstructors = function(id){
               var adx = ctrl.tmp_instructors_added.indexOf(id);
               if( adx !== -1 ){
                   ctrl.tmp_instructors_added.splice(adx,1);
               }

               ctrl.tmp_instructors.splice( ctrl.tmp_instructors.indexOf(id),1);
               ctrl.tmp_instructors_removed.push(id);
               ctrl.tmp_instructors_searchs = {};
           };

           ctrl.addToInstructors = function(id){
               ctrl.tmp_instructors.push( id );
               ctrl.tmp_instructors_added.push( id );

               var rdx = ctrl.tmp_instructors_removed.indexOf(id);
               if( rdx !== -1 ){
                   ctrl.tmp_instructors_removed.splice(rdx,1);
               }

               Object.keys( ctrl.tmp_instructors_searchs ).forEach(function(k){
                   var idx = ctrl.tmp_instructors_searchs[k].indexOf(id);
                   if( idx !== -1 ){
                       ctrl.tmp_instructors_searchs[k].splice( idx, 1);
                   }
               });
           };

           ctrl.updateInstructors = function( instructors ){
               var step = 1,
                    deferred = $q.defer(),
                    done = function(){
                        step--;
                        if( !step ){
                            ctrl.editInstructors = false;
                            deferred.resolve();
                        }
                    };

                ctrl.tmp_instructors_added.forEach(function( id ){
                    step++;
                    page_users.updatePinned( id, ctrl.page.datum.id, true ).then(done);
                });

                ctrl.tmp_instructors_removed.forEach(function( id ){
                    step++;
                    page_users.updatePinned( id, ctrl.page.datum.id, false ).then(done);
                });

                done();
                return deferred.promise;
            };

            ctrl.updateLogo = function(blob){
                return pages.updateLogo(ctrl.page.datum.id, blob);
            };

            ctrl.updateCover = function(blob){
                return pages.updateCover(ctrl.page.datum.id, blob);
            };

            ctrl.updateAddress = function(address){
                return pages.updateAddress(ctrl.page.datum.id, address).then(function(){
                    ctrl.editMap = false;
                });
            };

            ctrl.updateWebsite = function(website){
                return pages.updateWebsite(ctrl.page.datum.id, website).then(function(){
                    ctrl.editWebsite = false;
                });
            };

            ctrl.updateDescription = function(description){
                return pages.updateDescription(ctrl.page.datum.id, description).then(function(){
                    ctrl.editDescription = false;
                    if(ctrl.onDescriptionChanged){
                        ctrl.onDescriptionChanged();
                    }
                });
            };

            ctrl.updateDates = function(start, end){
                return pages.updateDates(ctrl.page.datum.id, start, end).then(function(){
                    ctrl.editingDates = false;
                });
            };

            ctrl.updateTitle = function(title){
                return pages.updateTitle(ctrl.page.datum.id, title).then(function(){
                    ctrl.editTitle = false;
                });
            };

            ctrl.updateConfidentiality = function(confidentiality){
                var previous =  ctrl.page.datum.confidentiality;
                ctrl.page.datum.confidentiality = confidentiality;
                return pages.updateConfidentiality(ctrl.page.datum.id, confidentiality)
                    .then(function(){}, function(){ ctrl.page.datum.confidentiality = previous; });
            };
            
            
            ctrl.openChannel= function(){
                social_service.openConversation(null, null, ctrl.conversation.datum.id);
            };

            ctrl.switchPublishState = function(){
                if( !ctrl.switchingPubState ){
                    ctrl.switchingPubState = true;

                    pages.updatePublish(ctrl.page.datum.id, !ctrl.page.datum.is_published).then(function(){
                        ctrl.switchingPubState = false;

                        if( ctrl.page.datum.is_published ){
                            cvn_model.get([ctrl.page.datum.conversation_id]).then(function(){
                                ctrl.conversation = cvn_model.list[ctrl.page.datum.conversation_id];
                            });
                        }
                    });
                }
            };

            ctrl.updateCustom = function(libelle, custom){
                if(ctrl.isStudnetAdmin){
                    return pages.updateCustom(ctrl.page.datum.id, libelle, custom).then(function(){
                        $translate('ntf.admin_customfield_updated').then(function( translation ){
                            notifier_service.add({type:'message',message: translation});
                        });
                    });
                }
            };

            //IMPORT
            ctrl.openImportModal = function($event){
                modal_service.open({
                    reference: $event.target,
                    scope : {
                        import : function(users){
                            this.importing  = true;
                            return page_users.import(ctrl.page.datum.id, ctrl.users).then(function(errors){
                                this.importing = false;
                                this.close();

                                $translate('ntf.user_import',{number:(ctrl.users.length - errors.length)}).then(function( translation ){
                                    notifier_service.add({type:'message',message: translation});
                                });

                                errors.forEach(function(error){
                                    $translate('ntf.err_user_import',{error:error.message}).then(function( translation ){
                                        notifier_service.add({type:'error',message: translation});
                                    });
                                });
                            });
                        }
                    },
                    template:'app/shared/elements/import-csv/tpl/users-import-modal.html'
                });
            };


            ctrl.openPageModal =  page_modal_service.open;

            //STATE
            var pagetype;
            if( page.datum.type === pages_constants.pageTypes.COURSE ){
                ctrl.user_page_state_service = user_courses;

                events_service.on('page.'+page.datum.id+'.item.updated', getItemsCount );
                getItemsCount();

                pagetype = 'course';
            }else if( page.datum.type === pages_constants.pageTypes.EVENT ){
                ctrl.user_page_state_service = user_events;
                pagetype = 'event';
            }else if( page.datum.type === pages_constants.pageTypes.GROUP ){
                ctrl.user_page_state_service = user_groups;
                pagetype = 'group';
            }else if( page.datum.type === pages_constants.pageTypes.ORGANIZATION ){
                ctrl.user_page_state_service = user_organizations;
                pagetype = 'organization';
            }
            if(ctrl.user_page_state_service){
                ctrl.user_page_state_service.load(true).then(function(){
                    ctrl.state = ctrl.user_page_state_service.getUserState(page.datum.id);
                    onStateUpdated();
                });
            }
            else{
                ctrl.state = pages_constants.pageStates.NONE;
                onStateUpdated();
            }

          
            ctrl.edit = page_modal_service.open;



            function onUsersChanged(){
                ctrl.is_member = ctrl.isMember();
            }
            events_service.on('pageUsers' + ctrl.page.datum.id, onUsersChanged);
            events_service.on('userState#'+page.datum.id,onStateUpdated);
             
            events_service.on('pageDeleted#'+page.datum.id,onPageDeleted);
             
            $scope.$on('$destroy',function(){
                events_service.off('page.'+page.datum.id+'.item.updated');
                events_service.off('pageUsers' + page.datum.id);
                events_service.off('page.'+page.datum.id+'.item.updated', getItemsCount );
                events_service.off('userState#'+page.datum.id,onStateUpdated);
                events_service.off('pageDeleted#'+page.datum.id,onPageDeleted);
                events_service.off('pageUsers' + ctrl.page.datum.id, onUsersChanged);
            });

            // GETTING ITEMS COUNT ( COURSE ONLY )
            function getItemsCount(){
                api_service.send('item.getCountByPage',{page_id:page.datum.id}).then(function( count ){
                    ctrl.items_count = count;
                });
            }
            
            function onPageDeleted(){
                
                $state.go('lms.dashboard');
            };
        
            
            function onStateUpdated(){
                page_users.load(ctrl.page.datum.id, true).then(function(){
                    ctrl.is_member = ctrl.isMember();
                    ctrl.state = ctrl.user_page_state_service.getUserState(page.datum.id);
                    var oldShowContent = ctrl.showContent;
                    ctrl.showContent = ctrl.editable || page.datum.confidentiality === 0 || ctrl.state === pages_constants.pageStates.MEMBER;
                    if(oldShowContent === false && ctrl.showContent && !ctrl.editable){
                        $state.go('lms.page.timeline',{ id : page.datum.id, type : ctrl.label });
                    }
                    else if(page.datum.confidentiality === 2 && ctrl.state === pages_constants.pageStates.NONE && !ctrl.editable){
                        $state.go('lms.dashboard');
                    }
                    else if(!ctrl.showContent && $state.current.name.slice(0,14) !== 'lms.page.users' && !ctrl.editable){
                        $state.go('lms.page.users.all',{ id : page.datum.id, type : ctrl.label });
                    }
                });
              
            }
            
            
          
        }
    ]);
